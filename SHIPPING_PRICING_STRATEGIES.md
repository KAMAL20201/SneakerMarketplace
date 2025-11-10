# Shipping Pricing Strategies for Indian Marketplace

## Problem Statement

**Current Issue:**
- Sellers must set a fixed shipping price when creating a listing
- Buyer location is unknown at listing time
- Shipping costs vary significantly across India:
  - Mumbai → Delhi: ₹60-80
  - Mumbai → Guwahati (Northeast): ₹150-200
  - Mumbai → Leh (Remote): ₹250-350

**Example:** A seller in Bangalore lists sneakers with ₹80 shipping. A buyer in Arunachal Pradesh orders, but actual cost is ₹180. Seller loses ₹100, or buyer gets overcharged if seller sets high price.

---

## Solution Options for Indian Market

### Option 1: Dynamic Shipping Calculator (RECOMMENDED) ⭐

**How it works:**
- Seller sets shipping charges as **₹0 or "Calculate at checkout"** during listing
- At checkout, system calculates actual shipping cost based on:
  - Seller's pincode (from pickup address)
  - Buyer's delivery pincode
  - Package dimensions/weight (estimated or seller-provided)
- Real-time rates from courier APIs (Delhivery, Blue Dart, DTDC)
- Buyer pays actual shipping cost

**Implementation:**

```typescript
// 1. During listing creation (Sell.tsx)
// Add option: "Calculate shipping at checkout"

<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="dynamicShipping"
    checked={formData.dynamicShipping}
    onChange={(e) =>
      setFormData({
        ...formData,
        dynamicShipping: e.target.checked,
        shippingCharges: e.target.checked ? "0" : formData.shippingCharges
      })
    }
  />
  <Label htmlFor="dynamicShipping">
    Calculate shipping at checkout (Recommended)
  </Label>
</div>

{!formData.dynamicShipping && (
  <Input
    id="shippingCharges"
    type="number"
    placeholder="Fixed shipping amount"
    value={formData.shippingCharges}
    // ... existing code
  />
)}

// 2. Add package details (required for dynamic shipping)
{formData.dynamicShipping && (
  <div>
    <Label>Package Details (for shipping calculation)</Label>
    <div className="grid grid-cols-3 gap-2">
      <Input
        placeholder="Length (cm)"
        value={formData.packageLength}
        onChange={(e) => setFormData({...formData, packageLength: e.target.value})}
      />
      <Input
        placeholder="Width (cm)"
        value={formData.packageWidth}
        onChange={(e) => setFormData({...formData, packageWidth: e.target.value})}
      />
      <Input
        placeholder="Height (cm)"
        value={formData.packageHeight}
        onChange={(e) => setFormData({...formData, packageHeight: e.target.value})}
      />
    </div>
    <Input
      placeholder="Weight (kg)"
      value={formData.packageWeight}
      onChange={(e) => setFormData({...formData, packageWeight: e.target.value})}
      className="mt-2"
    />
  </div>
)}
```

```typescript
// 3. At checkout (PaymentStep.tsx)
// Calculate shipping in real-time

const [shippingCost, setShippingCost] = useState<number>(0);
const [calculatingShipping, setCalculatingShipping] = useState(false);

useEffect(() => {
  const calculateShipping = async () => {
    setCalculatingShipping(true);

    try {
      // Get seller's pickup pincode
      const { data: seller } = await supabase
        .from('sellers')
        .select('pickup_address')
        .eq('id', item.seller_id)
        .single();

      const pickupPincode = seller.pickup_address?.pincode;
      const deliveryPincode = shippingAddress.pincode;

      // Call shipping rate API
      const response = await supabase.functions.invoke('calculate-shipping-rate', {
        body: {
          pickup_pincode: pickupPincode,
          delivery_pincode: deliveryPincode,
          weight: item.package_weight || 1, // Default 1kg for sneakers
          dimensions: {
            length: item.package_length || 30,
            width: item.package_width || 20,
            height: item.package_height || 10
          }
        }
      });

      setShippingCost(response.data.cheapest_rate);
    } catch (error) {
      console.error('Shipping calculation failed:', error);
      toast.error('Could not calculate shipping. Please contact seller.');
    } finally {
      setCalculatingShipping(false);
    }
  };

  if (shippingAddress && items.length > 0) {
    calculateShipping();
  }
}, [shippingAddress, items]);
```

```typescript
// 4. Create Edge Function: calculate-shipping-rate

// supabase/functions/calculate-shipping-rate/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { pickup_pincode, delivery_pincode, weight, dimensions } = await req.json();

  // Call Delhivery API for rate calculation
  const delhiveryResponse = await fetch(
    `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?` +
    `md=S&ss=Delivered&d_pin=${delivery_pincode}&o_pin=${pickup_pincode}&` +
    `cgm=${weight * 1000}&pt=Pre-paid`,
    {
      headers: {
        "Authorization": `Token ${Deno.env.get('DELHIVERY_API_KEY')}`,
        "Content-Type": "application/json"
      }
    }
  );

  const delhiveryData = await delhiveryResponse.json();

  // Call Blue Dart API (if available)
  // Call DTDC API (if available)

  // Parse and return cheapest rate
  const rates = [
    {
      courier: 'Delhivery',
      rate: delhiveryData[0]?.total_amount || 0,
      estimated_days: 3
    }
    // Add other courier rates
  ];

  const cheapestRate = Math.min(...rates.map(r => r.rate));

  return new Response(
    JSON.stringify({
      cheapest_rate: cheapestRate,
      all_rates: rates
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
```

**Database Schema Changes:**

```sql
ALTER TABLE product_listings
  ADD COLUMN dynamic_shipping BOOLEAN DEFAULT false,
  ADD COLUMN package_weight_kg NUMERIC(5,2),
  ADD COLUMN package_length_cm NUMERIC(5,1),
  ADD COLUMN package_width_cm NUMERIC(5,1),
  ADD COLUMN package_height_cm NUMERIC(5,1);

-- Store calculated shipping in orders
ALTER TABLE orders
  ADD COLUMN calculated_shipping_cost NUMERIC(10,2),
  ADD COLUMN shipping_courier_used TEXT;
```

**Pros:**
- ✅ Fair for both buyer and seller (actual cost)
- ✅ No overcharging or undercharging
- ✅ Transparent pricing
- ✅ Competitive rates from multiple couriers
- ✅ Works with self-shipping model

**Cons:**
- ⚠️ Requires courier API integration (cost: ₹5-10k/month)
- ⚠️ API failures could block checkout
- ⚠️ Slight checkout friction (calculation delay)

**Fallback for API Failure:**
```typescript
// If API fails, use zone-based flat rates
const fallbackRates = {
  local: 50,      // Same city
  regional: 80,   // Same state
  national: 120,  // Other states
  northeast: 180  // Northeast/Remote
};
```

---

### Option 2: Zone-Based Flat Rates (SIMPLE & RELIABLE) ⭐

**How it works:**
- Divide India into shipping zones
- Seller sets price per zone during listing
- System auto-detects buyer's zone from pincode
- Buyer pays zone-specific rate

**Zones for India:**

```typescript
const SHIPPING_ZONES = {
  LOCAL: {
    name: 'Local (Same City)',
    description: 'Delivery within same city',
    example: 'Delhi → Delhi'
  },
  REGIONAL: {
    name: 'Regional (Same State)',
    description: 'Delivery within same state',
    example: 'Mumbai → Pune'
  },
  METRO: {
    name: 'Metro Cities',
    description: 'Delhi, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad',
    pincodeRanges: ['110xxx', '400xxx', '560xxx', '600xxx', '700xxx', '500xxx']
  },
  NORTH: {
    name: 'North India',
    states: ['Punjab', 'Haryana', 'Uttarakhand', 'Himachal Pradesh', 'J&K', 'Chandigarh']
  },
  SOUTH: {
    name: 'South India',
    states: ['Karnataka', 'Tamil Nadu', 'Kerala', 'Telangana', 'Andhra Pradesh', 'Puducherry']
  },
  EAST: {
    name: 'East India',
    states: ['West Bengal', 'Odisha', 'Bihar', 'Jharkhand']
  },
  WEST: {
    name: 'West India',
    states: ['Maharashtra', 'Gujarat', 'Rajasthan', 'Goa']
  },
  NORTHEAST: {
    name: 'Northeast & Islands',
    states: ['Assam', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Tripura', 'Sikkim', 'Arunachal Pradesh', 'Andaman & Nicobar', 'Lakshadweep']
  }
};
```

**Implementation:**

```typescript
// 1. During listing (Sell.tsx - Step 6)

<div>
  <Label className="text-gray-800 font-semibold text-base md:text-lg mb-3 block">
    Shipping Charges by Zone *
  </Label>
  <div className="space-y-3">
    {Object.entries(SHIPPING_ZONES).map(([key, zone]) => (
      <div key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border">
        <div>
          <p className="font-medium">{zone.name}</p>
          <p className="text-xs text-gray-500">{zone.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">₹</span>
          <Input
            type="number"
            placeholder="0"
            value={formData.shippingRates?.[key] || ''}
            onChange={(e) => setFormData({
              ...formData,
              shippingRates: {
                ...formData.shippingRates,
                [key]: e.target.value
              }
            })}
            className="w-24 h-10"
          />
        </div>
      </div>
    ))}
  </div>

  {/* Quick Fill Options */}
  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
    <p className="text-sm font-medium mb-2">Quick Fill Suggested Rates:</p>
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => setFormData({
          ...formData,
          shippingRates: {
            LOCAL: '40', REGIONAL: '60', METRO: '80',
            NORTH: '100', SOUTH: '100', EAST: '100', WEST: '100',
            NORTHEAST: '180'
          }
        })}
      >
        Light (0.5kg) - Total: ₹660
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => setFormData({
          ...formData,
          shippingRates: {
            LOCAL: '60', REGIONAL: '80', METRO: '100',
            NORTH: '120', SOUTH: '120', EAST: '120', WEST: '120',
            NORTHEAST: '220'
          }
        })}
      >
        Standard (1kg) - Total: ₹940
      </Button>
    </div>
  </div>
</div>
```

```typescript
// 2. Zone Detection Service

// src/lib/shippingZones.ts

export class ShippingZoneService {
  // Pincode to state mapping (simplified)
  private static pincodeToState: Record<string, string> = {
    '11': 'Delhi', '12': 'Haryana', '13': 'Punjab',
    '14': 'Punjab', '15': 'Haryana', '16': 'Punjab',
    '17': 'Himachal Pradesh', '18': 'Jammu & Kashmir',
    '40': 'Maharashtra', '41': 'Maharashtra', '42': 'Maharashtra',
    '56': 'Karnataka', '57': 'Karnataka',
    '60': 'Tamil Nadu', '61': 'Tamil Nadu',
    '70': 'West Bengal', '71': 'West Bengal',
    '50': 'Telangana', '51': 'Andhra Pradesh',
    // ... add all Indian pincode prefixes
  };

  static detectZone(sellerPincode: string, buyerPincode: string): string {
    // Same city check
    if (sellerPincode.substring(0, 3) === buyerPincode.substring(0, 3)) {
      return 'LOCAL';
    }

    // Same state check
    const sellerState = this.getState(sellerPincode);
    const buyerState = this.getState(buyerPincode);

    if (sellerState === buyerState) {
      return 'REGIONAL';
    }

    // Metro check
    const metroPincodes = ['110', '400', '560', '600', '700', '500'];
    if (metroPincodes.some(prefix => buyerPincode.startsWith(prefix))) {
      return 'METRO';
    }

    // Zone check
    if (this.isNortheast(buyerState)) {
      return 'NORTHEAST';
    }

    const sellerRegion = this.getRegion(sellerState);
    const buyerRegion = this.getRegion(buyerState);

    return buyerRegion;
  }

  private static getState(pincode: string): string {
    const prefix = pincode.substring(0, 2);
    return this.pincodeToState[prefix] || 'Unknown';
  }

  private static getRegion(state: string): string {
    const regions = {
      NORTH: ['Punjab', 'Haryana', 'Delhi', 'Uttarakhand', 'Himachal Pradesh', 'Jammu & Kashmir'],
      SOUTH: ['Karnataka', 'Tamil Nadu', 'Kerala', 'Telangana', 'Andhra Pradesh'],
      EAST: ['West Bengal', 'Odisha', 'Bihar', 'Jharkhand'],
      WEST: ['Maharashtra', 'Gujarat', 'Rajasthan', 'Goa'],
      NORTHEAST: ['Assam', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Tripura', 'Sikkim', 'Arunachal Pradesh']
    };

    for (const [region, states] of Object.entries(regions)) {
      if (states.includes(state)) {
        return region;
      }
    }

    return 'METRO';
  }

  private static isNortheast(state: string): boolean {
    const northeastStates = ['Assam', 'Meghalaya', 'Manipur', 'Mizoram', 'Nagaland', 'Tripura', 'Sikkim', 'Arunachal Pradesh'];
    return northeastStates.includes(state);
  }
}
```

```typescript
// 3. At checkout (PaymentStep.tsx)

const calculateZoneShipping = async () => {
  // Get seller's pincode
  const { data: listing } = await supabase
    .from('product_listings')
    .select('shipping_rates, user_id')
    .eq('id', item.id)
    .single();

  const { data: seller } = await supabase
    .from('sellers')
    .select('pickup_address')
    .eq('id', listing.user_id)
    .single();

  const sellerPincode = seller.pickup_address?.pincode;
  const buyerPincode = shippingAddress.pincode;

  // Detect zone
  const zone = ShippingZoneService.detectZone(sellerPincode, buyerPincode);

  // Get shipping cost for zone
  const shippingCost = listing.shipping_rates?.[zone] || 0;

  setShippingCost(shippingCost);
  setShippingZone(zone);
};
```

**Database Schema:**

```sql
ALTER TABLE product_listings
  ADD COLUMN shipping_rates JSONB DEFAULT '{}'::jsonb;

-- Example data:
-- {
--   "LOCAL": 40,
--   "REGIONAL": 60,
--   "METRO": 80,
--   "NORTH": 100,
--   "SOUTH": 100,
--   "EAST": 100,
--   "WEST": 100,
--   "NORTHEAST": 180
-- }
```

**Pros:**
- ✅ Simple for sellers to understand
- ✅ No API dependencies (100% reliable)
- ✅ Fast checkout (instant calculation)
- ✅ Predictable costs for sellers
- ✅ Works offline

**Cons:**
- ⚠️ May not reflect exact costs
- ⚠️ Seller needs to set 8 different prices

---

### Option 3: Flat National Shipping (SIMPLEST)

**How it works:**
- Seller sets ONE flat shipping price for entire India
- Buyer pays same amount regardless of location
- Seller absorbs cost difference

**Example:**
- Seller sets ₹100 flat shipping
- Cost to Delhi: ₹60 (seller profits ₹40)
- Cost to Guwahati: ₹180 (seller loses ₹80)
- **Average profit/loss balances out over multiple orders**

**Implementation:**

```typescript
// Current implementation (already exists in your code!)
// Lines 1026-1054 in Sell.tsx

<Input
  id="shippingCharges"
  type="number"
  placeholder="0.00"
  value={formData.shippingCharges}
  onChange={(e) => setFormData({ ...formData, shippingCharges: e.target.value })}
  className="pl-8 md:pl-12 glass-input rounded-2xl border-0 h-12 md:h-14"
/>
```

**Suggested Average Rates:**
- Sneakers (1-1.5kg): ₹100-120
- Clothing (0.5kg): ₹60-80
- Electronics (2-3kg): ₹150-180

**Pros:**
- ✅ Super simple for sellers
- ✅ No coding required (already implemented!)
- ✅ Fast checkout
- ✅ Easy for buyers to understand

**Cons:**
- ⚠️ Seller takes on cost risk
- ⚠️ May overcharge local buyers
- ⚠️ May undercharge remote buyers
- ⚠️ Not fair for all orders

---

### Option 4: Free Shipping (Price Inclusive)

**How it works:**
- Seller includes shipping in product price
- Shows "Free Shipping" badge
- Seller absorbs all shipping costs

**Example:**
- Sneakers actual price: ₹5,000
- Expected avg shipping: ₹100
- **Listed price: ₹5,100** (with "Free Shipping")

**Implementation:**

```typescript
// Add checkbox in listing form

<div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
  <input
    type="checkbox"
    id="freeShipping"
    checked={formData.freeShipping}
    onChange={(e) => setFormData({
      ...formData,
      freeShipping: e.target.checked,
      shippingCharges: e.target.checked ? '0' : formData.shippingCharges
    })}
  />
  <Label htmlFor="freeShipping">
    <span className="font-semibold">Offer Free Shipping</span>
    <p className="text-xs text-gray-600">Include shipping cost in product price. Free shipping listings get 30% more visibility!</p>
  </Label>
</div>
```

**Display on product cards:**

```typescript
{listing.free_shipping && (
  <Badge className="bg-green-500 text-white">
    Free Shipping
  </Badge>
)}
```

**Pros:**
- ✅ Great marketing ("FREE SHIPPING!")
- ✅ Higher conversion rates (buyers love free shipping)
- ✅ Simple for buyers
- ✅ No calculation needed

**Cons:**
- ⚠️ Seller absorbs all costs
- ⚠️ May discourage long-distance sales
- ⚠️ Less transparent pricing

---

### Option 5: Buyer Pays Actual (COD Model)

**How it works:**
- Seller ships with their courier
- Buyer pays shipping charges to courier at delivery
- Platform not involved in shipping payment

**Only works with Cash on Delivery (COD)**

**Implementation:**

```typescript
<Select
  onValueChange={(value) => setFormData({ ...formData, shippingPayment: value })}
>
  <SelectItem value="prepaid">Prepaid (included in order)</SelectItem>
  <SelectItem value="to-pay">To-Pay (buyer pays courier at delivery)</SelectItem>
</Select>

{formData.shippingPayment === 'to-pay' && (
  <div className="p-3 bg-amber-50 rounded-lg">
    <p className="text-sm text-amber-700">
      ⚠️ Buyer will pay shipping charges directly to courier at delivery.
      Make sure to mention this in product description.
    </p>
  </div>
)}
```

**Pros:**
- ✅ Zero risk for seller
- ✅ Exact costs paid
- ✅ Simple implementation

**Cons:**
- ⚠️ Requires COD support
- ⚠️ Poor user experience (surprise charge at delivery)
- ⚠️ May reduce conversions
- ⚠️ Trust issues

---

## RECOMMENDATION: Hybrid Approach

**Best solution for your sneaker marketplace:**

### Phase 1: Immediate (Use Option 2 - Zone-Based)
- Implement zone-based shipping rates
- 8 zones covering all of India
- Reliable, no API dependencies
- Fair pricing for buyers and sellers
- Sellers can set competitive rates

### Phase 2: Future (Add Option 1 - Dynamic)
- Integrate courier APIs for real-time rates
- Give sellers choice: "Use zone rates" OR "Calculate at checkout"
- Fallback to zone rates if API fails
- Best of both worlds

### Implementation Plan:

```typescript
// Listing Form Enhancement

<div className="space-y-4">
  <Label className="text-lg font-semibold">Shipping Method</Label>

  <div className="space-y-3">
    <div
      className={`border-2 rounded-lg p-4 cursor-pointer ${
        formData.shippingMethod === 'zone' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
      onClick={() => setFormData({ ...formData, shippingMethod: 'zone' })}
    >
      <h4 className="font-medium">Zone-Based Rates (Recommended)</h4>
      <p className="text-sm text-gray-600">Set different rates for different regions</p>
    </div>

    <div
      className={`border-2 rounded-lg p-4 cursor-pointer ${
        formData.shippingMethod === 'dynamic' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
      onClick={() => setFormData({ ...formData, shippingMethod: 'dynamic' })}
    >
      <h4 className="font-medium">Calculate at Checkout</h4>
      <p className="text-sm text-gray-600">Automatic calculation based on buyer location</p>
    </div>

    <div
      className={`border-2 rounded-lg p-4 cursor-pointer ${
        formData.shippingMethod === 'flat' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
      onClick={() => setFormData({ ...formData, shippingMethod: 'flat' })}
    >
      <h4 className="font-medium">Flat Rate</h4>
      <p className="text-sm text-gray-600">Same rate for all of India</p>
    </div>

    <div
      className={`border-2 rounded-lg p-4 cursor-pointer ${
        formData.shippingMethod === 'free' ? 'border-green-500 bg-green-50' : 'border-gray-200'
      }`}
      onClick={() => setFormData({ ...formData, shippingMethod: 'free' })}
    >
      <h4 className="font-medium">Free Shipping ⭐</h4>
      <p className="text-sm text-gray-600">Attract more buyers!</p>
    </div>
  </div>

  {/* Show appropriate form based on selection */}
  {formData.shippingMethod === 'zone' && <ZoneBasedShippingForm />}
  {formData.shippingMethod === 'dynamic' && <DynamicShippingForm />}
  {formData.shippingMethod === 'flat' && <FlatRateShippingForm />}
</div>
```

---

## Comparison Table

| Method | Seller Effort | Buyer Experience | Fairness | Reliability | Best For |
|--------|--------------|------------------|----------|-------------|----------|
| **Dynamic Calculator** | Low (set dimensions once) | Excellent (exact cost) | Very Fair | Medium (API dependency) | High-value items |
| **Zone-Based** ⭐ | Medium (8 rates) | Good (predictable) | Fair | High (no API) | **RECOMMENDED** |
| **Flat National** | Very Low (1 rate) | Good (simple) | Medium | High | Small/light items |
| **Free Shipping** | Low (include in price) | Excellent (love free!) | Low (seller absorbs) | High | Marketing/promos |
| **Buyer Pays COD** | Very Low | Poor (surprise charge) | Very Fair | High | Avoid |

---

## Database Schema for All Options

```sql
-- Add to product_listings table
ALTER TABLE product_listings
  -- Shipping method type
  ADD COLUMN shipping_method TEXT DEFAULT 'flat',
    -- Values: 'flat', 'zone', 'dynamic', 'free', 'to-pay'

  -- Flat rate
  ADD COLUMN shipping_charges NUMERIC(10,2) DEFAULT 0,

  -- Zone-based rates
  ADD COLUMN shipping_rates JSONB DEFAULT '{}'::jsonb,

  -- Dynamic calculation (package info)
  ADD COLUMN package_weight_kg NUMERIC(5,2),
  ADD COLUMN package_dimensions JSONB,
    -- {"length": 30, "width": 20, "height": 10}

  -- Free shipping flag
  ADD COLUMN free_shipping BOOLEAN DEFAULT false;

-- Example queries:

-- Get shipping cost for zone-based
SELECT shipping_rates->>'NORTHEAST' as northeast_cost FROM product_listings WHERE id = 'xxx';

-- Get all products with free shipping
SELECT * FROM product_listings WHERE free_shipping = true;

-- Get products that calculate at checkout
SELECT * FROM product_listings WHERE shipping_method = 'dynamic';
```

---

## UI/UX Recommendations

### 1. Product Listing Page
```
Product: Nike Air Jordan 1
Price: ₹12,000

Shipping:
• Local (Same City): ₹40
• Regional (Same State): ₹60
• Metro Cities: ₹80
• North/South/East/West India: ₹100
• Northeast & Islands: ₹180

[Calculate exact shipping at checkout]
```

### 2. Cart Page
```
Subtotal: ₹24,000
Shipping: Will be calculated based on your delivery address

Note: Enter delivery address to see exact shipping cost
```

### 3. Checkout Page
```
Shipping to: Guwahati, Assam - 781001

Shipping Breakdown:
• Seller: Mumbai Sneakers
• Zone: Northeast
• Shipping: ₹180

Total: ₹24,180

✅ Shipping cost is based on distance and package weight
```

---

## My Recommendation for Your Marketplace

**Start with Option 2 (Zone-Based Flat Rates)** because:

1. ✅ **No API costs initially** - Save ₹10k/month
2. ✅ **Works 100% reliably** - No API failures blocking checkout
3. ✅ **Simple for sellers** - Easy to understand and set
4. ✅ **Fair for buyers** - Transparent zone-based pricing
5. ✅ **Can upgrade later** - Add dynamic calculator in Phase 2
6. ✅ **Perfect for sneakers** - Predictable size/weight
7. ✅ **Aligns with self-shipping** - Seller controls courier choice

**Implementation Time:**
- Zone-based: 2-3 days
- Dynamic calculator: 7-10 days (requires API integration)

**Next Steps:**
1. Modify `Sell.tsx` to add zone-based shipping form
2. Create `ShippingZoneService.ts` for zone detection
3. Update `PaymentStep.tsx` to calculate zone shipping
4. Add database migration for `shipping_rates` column
5. Test with sellers in different cities

Would you like me to start implementing the zone-based shipping system?
