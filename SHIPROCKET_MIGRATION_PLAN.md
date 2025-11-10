# Shiprocket Migration Plan: Self-Shipping Model for Indian Market

## Executive Summary

This document outlines a comprehensive plan to migrate from Shiprocket to a **self-shipping model** where sellers ship products themselves while maintaining order tracking and implementing an **escrow payment system** that releases funds only after delivery confirmation.

**Key Objectives:**
- ✅ Enable sellers to ship products using their preferred courier partners
- ✅ Track orders through multiple Indian logistics providers
- ✅ Implement payment escrow: Pay sellers only after delivery confirmation
- ✅ Maintain platform reliability and trust
- ✅ Reduce dependency on single aggregator (Shiprocket)

---

## 1. Current State Analysis

### What's Currently Implemented:
- Shiprocket integration for courier selection and order creation
- Pickup address collection from sellers
- Basic order status management (pending → confirmed → shipped → delivered)
- Razorpay payment integration (immediate capture)
- Email notifications for order updates
- **No seller payout system** (appears manual)
- **No tracking webhooks** from Shiprocket
- **No escrow/hold logic** for payments

### Critical Gap:
**Payments are collected from buyers but there's NO automated system to pay sellers after delivery.** This needs to be built regardless of shipping solution.

---

## 2. Proposed Self-Shipping Model

### Model Overview: Hybrid Self-Ship with Multi-Courier Tracking

Sellers ship products themselves using their choice of courier partner, while the platform:
1. Provides tracking integration with major Indian couriers
2. Holds payment in escrow until delivery confirmation
3. Automatically releases payment to seller after delivery
4. Handles disputes and return scenarios

### Why This Works for Indian Market:

**Advantages:**
- ✅ Sellers often have existing courier relationships with better rates
- ✅ Local sellers can use regional couriers (Delhivery, DTDC, Blue Dart, India Post, etc.)
- ✅ Flexibility for sellers to choose fastest/cheapest option
- ✅ Platform doesn't bear shipping cost markup risk
- ✅ Better profit margins for both platform and sellers

**Challenges to Address:**
- ⚠️ Need tracking integration with multiple couriers
- ⚠️ Fraud risk: Seller claims shipped but doesn't ship
- ⚠️ Delivery confirmation reliability
- ⚠️ Dispute resolution complexity

---

## 3. Technical Architecture

### 3.1 System Components

```
┌─────────────┐
│   Buyer     │ Pays via Razorpay
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  Payment Escrow System      │
│  (Hold funds until delivery)│
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Order Management System    │
│  - Status tracking          │
│  - Notifications            │
└──────┬──────────────────────┘
       │
       ├───────────────────────┐
       ▼                       ▼
┌─────────────┐      ┌──────────────────┐
│   Seller    │      │ Tracking System  │
│ Ships order │      │ Multi-courier API│
└─────────────┘      └────────┬─────────┘
                              │
                     ┌────────┴─────────┐
                     ▼                  ▼
              ┌─────────────┐    ┌──────────────┐
              │ Delhivery   │    │  Shiprocket  │
              │ Blue Dart   │    │  (tracking   │
              │ DTDC        │    │   only)      │
              │ India Post  │    └──────────────┘
              │ Xpressbees  │
              └─────────────┘
                     │
                     ▼ Delivery confirmed
              ┌─────────────────┐
              │ Auto Payout to  │
              │     Seller      │
              └─────────────────┘
```

### 3.2 Core Features to Build

#### **A. Multi-Courier Tracking Integration**
- Integrate with top Indian courier tracking APIs:
  - **Delhivery** (API-based tracking)
  - **Blue Dart** (API-based tracking)
  - **DTDC** (API-based tracking)
  - **India Post** (Speed Post tracking)
  - **Xpressbees** (API-based tracking)
  - **Shiprocket** (keep for tracking-only, if seller uses it)

- Unified tracking interface: Abstract different courier APIs behind single interface
- Webhook handlers for delivery status updates
- Manual tracking number entry with auto-courier detection

#### **B. Payment Escrow System**
- Hold buyer payments in platform account (Razorpay supports this)
- Track payment status: `captured` → `held` → `released` or `refunded`
- Auto-release payment to seller after:
  - Delivery confirmation from courier API
  - AND X days grace period (3-7 days for returns)
- Manual release option for admin in case of disputes

#### **C. Seller Payout System**
- Collect seller bank details (already have `seller_payment_methods` table)
- Use **Razorpay Route/Razorpay X** for automated payouts to seller bank accounts
- Payout schedule: Daily/Weekly batch processing
- Payout tracking and reconciliation dashboard
- GST/TDS deduction support (for Indian compliance)

#### **D. Fraud Prevention**
- Require valid tracking number before marking as "shipped"
- Validate tracking number against courier API
- Seller rating system based on delivery success rate
- Automatic flags for suspicious patterns (e.g., frequent fake tracking numbers)
- Insurance option for high-value sneakers (₹10,000+)

#### **E. Dispute Resolution**
- Buyer "Report Issue" feature for non-delivery or wrong product
- Freeze payout if dispute raised within grace period
- Admin dashboard for dispute management
- Evidence collection: Photos, tracking screenshots
- Resolution options: Refund buyer, release to seller, partial settlement

---

## 4. Database Schema Changes

### 4.1 New Tables

```sql
-- Shipments tracking table
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  courier_partner TEXT NOT NULL, -- 'delhivery', 'bluedart', 'dtdc', 'indiapost', etc.
  tracking_number TEXT NOT NULL UNIQUE,
  awb_number TEXT, -- Air Waybill number (same as tracking for some couriers)

  -- Shipping details
  shipped_at TIMESTAMPTZ,
  expected_delivery_date DATE,
  actual_delivery_date TIMESTAMPTZ,

  -- Current status
  current_status TEXT DEFAULT 'pending_pickup',
    -- 'pending_pickup', 'picked_up', 'in_transit', 'out_for_delivery',
    -- 'delivered', 'failed_delivery', 'returned'

  -- Tracking events (JSONB array of status updates)
  tracking_events JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"status": "picked_up", "location": "Mumbai", "timestamp": "2025-01-15T10:30:00Z", "description": "Shipment picked up"}]

  -- Package details
  weight_grams INTEGER,
  dimensions_cm JSONB, -- {"length": 30, "width": 20, "height": 10}

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(current_status);


-- Payment escrow tracking
CREATE TABLE payment_escrows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  payment_id UUID REFERENCES payments(id),

  -- Amount breakdown
  total_amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) DEFAULT 0, -- Your marketplace commission
  seller_payout_amount NUMERIC(10,2) NOT NULL, -- Amount to be paid to seller

  -- Escrow status
  status TEXT DEFAULT 'held',
    -- 'held', 'released', 'refunded', 'disputed', 'partially_refunded'

  -- Timeline
  held_at TIMESTAMPTZ DEFAULT NOW(),
  release_eligible_at TIMESTAMPTZ, -- delivery_date + grace_period
  released_at TIMESTAMPTZ,

  -- Dispute tracking
  dispute_raised BOOLEAN DEFAULT false,
  dispute_raised_at TIMESTAMPTZ,
  dispute_reason TEXT,
  dispute_resolved_at TIMESTAMPTZ,
  dispute_resolution TEXT, -- 'seller_favor', 'buyer_favor', 'partial_refund'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_escrows_order_id ON payment_escrows(order_id);
CREATE INDEX idx_payment_escrows_status ON payment_escrows(status);
CREATE INDEX idx_payment_escrows_release_eligible ON payment_escrows(release_eligible_at)
  WHERE status = 'held' AND dispute_raised = false;


-- Seller payouts
CREATE TABLE seller_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Payout details
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',

  -- Related orders (JSONB array of order IDs included in this payout)
  order_ids JSONB NOT NULL,

  -- Payment method
  payment_method_id UUID REFERENCES seller_payment_methods(id),
  bank_account_number TEXT, -- Last 4 digits for reference
  ifsc_code TEXT,
  upi_id TEXT,

  -- Payout status
  status TEXT DEFAULT 'pending',
    -- 'pending', 'processing', 'completed', 'failed'

  -- Razorpay payout tracking
  razorpay_payout_id TEXT UNIQUE,
  razorpay_transfer_id TEXT,

  -- Tax deductions (Indian compliance)
  tds_amount NUMERIC(10,2) DEFAULT 0,
  gst_amount NUMERIC(10,2) DEFAULT 0,

  -- Timeline
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seller_payouts_seller_id ON seller_payouts(seller_id);
CREATE INDEX idx_seller_payouts_status ON seller_payouts(status);
CREATE INDEX idx_seller_payouts_created_at ON seller_payouts(created_at DESC);


-- Disputes table
CREATE TABLE order_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  raised_by UUID REFERENCES users(id), -- buyer or seller

  -- Dispute details
  type TEXT NOT NULL,
    -- 'non_delivery', 'wrong_product', 'damaged_product', 'fake_product', 'other'
  description TEXT NOT NULL,
  evidence JSONB, -- Array of image URLs, screenshots, etc.

  -- Status
  status TEXT DEFAULT 'open',
    -- 'open', 'under_review', 'resolved', 'closed'

  -- Resolution
  resolution TEXT, -- 'refund_buyer', 'release_seller', 'partial_refund', 'replacement'
  resolved_by UUID REFERENCES users(id), -- admin who resolved
  resolution_notes TEXT,

  -- Timeline
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_disputes_order_id ON order_disputes(order_id);
CREATE INDEX idx_order_disputes_status ON order_disputes(status);


-- Courier partner configuration
CREATE TABLE courier_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- 'delhivery', 'bluedart', 'dtdc', etc.
  display_name TEXT NOT NULL, -- 'Delhivery', 'Blue Dart', 'DTDC', etc.

  -- API configuration (encrypted)
  api_enabled BOOLEAN DEFAULT true,
  api_base_url TEXT,
  api_key_encrypted TEXT, -- Store encrypted API keys
  webhook_secret TEXT,

  -- Features
  supports_tracking BOOLEAN DEFAULT true,
  supports_webhooks BOOLEAN DEFAULT false,
  tracking_url_pattern TEXT, -- Template: "https://www.delhivery.com/track/package/{tracking_number}"

  -- Status
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate with major Indian couriers
INSERT INTO courier_partners (name, display_name, tracking_url_pattern) VALUES
  ('delhivery', 'Delhivery', 'https://www.delhivery.com/track/package/{tracking_number}'),
  ('bluedart', 'Blue Dart', 'https://www.bluedart.com/tracking/{tracking_number}'),
  ('dtdc', 'DTDC', 'https://www.dtdc.in/tracking/{tracking_number}'),
  ('indiapost', 'India Post', 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignmentno={tracking_number}'),
  ('xpressbees', 'Xpressbees', 'https://www.xpressbees.com/shipment/tracking/{tracking_number}'),
  ('ecom', 'Ecom Express', 'https://ecomexpress.in/tracking/?awb_field={tracking_number}'),
  ('shiprocket', 'Shiprocket', 'https://shiprocket.co/tracking/{tracking_number}'),
  ('other', 'Other Courier', NULL);
```

### 4.2 Modify Existing Tables

```sql
-- Add escrow tracking to orders
ALTER TABLE orders
  ADD COLUMN shipment_id UUID REFERENCES shipments(id),
  ADD COLUMN escrow_id UUID REFERENCES payment_escrows(id),
  ADD COLUMN delivery_confirmed_at TIMESTAMPTZ,
  ADD COLUMN grace_period_ends_at TIMESTAMPTZ;

-- Add payout tracking to payments
ALTER TABLE payments
  ADD COLUMN held_in_escrow BOOLEAN DEFAULT false,
  ADD COLUMN escrow_released_at TIMESTAMPTZ;

-- Add seller rating/trust score
ALTER TABLE sellers
  ADD COLUMN trust_score NUMERIC(3,2) DEFAULT 5.0, -- Out of 5.0
  ADD COLUMN total_orders_fulfilled INTEGER DEFAULT 0,
  ADD COLUMN successful_deliveries INTEGER DEFAULT 0,
  ADD COLUMN delivery_success_rate NUMERIC(5,2) DEFAULT 100.0, -- Percentage
  ADD COLUMN disputes_count INTEGER DEFAULT 0,
  ADD COLUMN last_payout_at TIMESTAMPTZ;

-- Ensure seller_payment_methods table exists
CREATE TABLE IF NOT EXISTS seller_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Payment method type
  method_type TEXT NOT NULL, -- 'bank_account', 'upi'

  -- Bank details
  account_holder_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  bank_name TEXT,

  -- UPI details
  upi_id TEXT,

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,

  -- Status
  is_primary BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Implementation Phases

### **Phase 1: Foundation (Weeks 1-2)** 🏗️

**Goal:** Set up database and basic tracking infrastructure

**Tasks:**
1. Create all new database tables and run migrations
2. Update existing tables with new columns
3. Set up Razorpay Route/X account for seller payouts
4. Implement `ShipmentService.ts` with basic CRUD operations
5. Implement `EscrowService.ts` for payment holding logic
6. Implement `PayoutService.ts` for seller payouts
7. Update order flow to create escrow entry on successful payment

**Deliverables:**
- Database schema fully migrated
- Backend services scaffolded
- Razorpay payout integration configured

---

### **Phase 2: Self-Shipping UI (Weeks 3-4)** 📦

**Goal:** Enable sellers to ship orders themselves

**Tasks:**
1. **Update Ship Now Flow:**
   - Remove Shiprocket courier selection
   - Add courier partner dropdown (Delhivery, Blue Dart, DTDC, India Post, Other)
   - Add tracking number input field
   - Add package weight/dimensions input
   - Add "Ship with my courier" button

2. **Tracking Number Validation:**
   - Basic format validation (alphanumeric, length checks)
   - Optional: Real-time validation against courier API
   - Prevent duplicate tracking numbers

3. **Create Shipment Record:**
   - When seller marks as shipped, create entry in `shipments` table
   - Link to order via `order_id`
   - Store courier partner and tracking number
   - Update order status to "shipped"
   - Send email notification to buyer with tracking info

4. **Buyer Tracking Page:**
   - `/orders/[orderId]/track` route
   - Display courier name, tracking number
   - Show clickable tracking link to courier website
   - Display shipment timeline (if available from API)

**Deliverables:**
- Sellers can ship orders with their own couriers
- Buyers receive tracking information
- Basic tracking UI functional

---

### **Phase 3: Multi-Courier Tracking Integration (Weeks 5-7)** 📍

**Goal:** Automate delivery status updates from courier APIs

**Tasks:**
1. **Implement Courier Adapters:**
   - Create `CourierAdapter` interface
   - Implement adapters for each courier:
     - `DelhiveryAdapter.ts`
     - `BlueDartAdapter.ts`
     - `DTDCAdapter.ts`
     - `IndiaPostAdapter.ts`
     - `XpressbeesAdapter.ts`

2. **Tracking Service:**
   - `TrackingService.ts` - unified interface for all couriers
   - Method: `getTrackingDetails(trackingNumber, courierName)`
   - Method: `updateShipmentStatus(shipmentId)`
   - Parse courier responses into standard format
   - Store tracking events in `shipments.tracking_events` JSONB

3. **Automated Status Sync:**
   - Cron job: Check shipment status every 6 hours for active shipments
   - Edge function: `sync-shipment-tracking`
   - Update `shipments.current_status`
   - Trigger notifications on status changes
   - Mark order as "delivered" when courier confirms delivery

4. **Webhook Handlers (if supported):**
   - Edge function: `courier-webhook-handler`
   - Parse webhook payloads from couriers
   - Verify webhook signatures
   - Update shipment status in real-time

5. **Enhanced Tracking UI:**
   - Real-time tracking timeline with status updates
   - Map view showing shipment location (if available)
   - Estimated delivery date
   - Push notifications on delivery status changes

**Deliverables:**
- Automated tracking updates from multiple couriers
- Real-time delivery confirmations
- Rich tracking experience for buyers

---

### **Phase 4: Payment Escrow & Auto-Payout (Weeks 8-10)** 💰

**Goal:** Hold payments until delivery, then auto-pay sellers

**Tasks:**
1. **Update Payment Flow:**
   - On successful Razorpay payment, create `payment_escrows` entry
   - Set status to "held"
   - Link to order and payment records

2. **Delivery Confirmation Logic:**
   - When shipment status changes to "delivered":
     - Update `orders.delivery_confirmed_at`
     - Calculate grace period (e.g., 7 days)
     - Set `payment_escrows.release_eligible_at = delivery_date + 7 days`

3. **Automated Payout Release:**
   - Daily cron job: Find escrows with `release_eligible_at <= NOW()` and no disputes
   - For each eligible escrow:
     - Calculate platform fee (e.g., 5% commission)
     - Calculate seller payout amount
     - Create `seller_payouts` entry with status "pending"
     - Add to payout queue

4. **Batch Payout Processing:**
   - Daily cron job: Process pending payouts
   - Use Razorpay Route API to transfer funds to seller bank account
   - Update payout status to "processing" → "completed" or "failed"
   - Update escrow status to "released"
   - Send email notification to seller

5. **Seller Payout Dashboard:**
   - `/seller/payouts` page
   - List all payouts with status
   - Show pending balance (orders delivered but in grace period)
   - Show available balance (ready for payout)
   - Payout history with transaction details
   - Download payout statements

6. **Admin Payout Management:**
   - `/admin/payouts` page
   - View all pending payouts
   - Manual payout release/hold options
   - Reconciliation dashboard
   - Export reports for accounting

**Deliverables:**
- Fully automated escrow and payout system
- Sellers receive payment 7 days after delivery
- Platform commission automatically deducted
- Transparent payout tracking

---

### **Phase 5: Fraud Prevention & Dispute Resolution (Weeks 11-12)** 🛡️

**Goal:** Protect buyers and sellers from fraud

**Tasks:**
1. **Tracking Number Verification:**
   - On "mark as shipped", validate tracking number with courier API
   - Reject if tracking number doesn't exist or is already delivered
   - Store verification status in shipments table

2. **Seller Trust Score:**
   - Calculate based on:
     - Delivery success rate
     - Average delivery time
     - Dispute count
     - Buyer ratings
   - Display trust score on product listings
   - Hide low-trust sellers from search results (score < 3.0)

3. **Buyer Dispute System:**
   - "Report Issue" button on order page
   - Dispute types: Non-delivery, Wrong product, Damaged product, Fake product
   - File upload for evidence (photos, screenshots)
   - Auto-freeze payout when dispute raised
   - Notify seller and admin

4. **Admin Dispute Resolution:**
   - `/admin/disputes` dashboard
   - View dispute details and evidence
   - Chat interface with buyer and seller
   - Resolution options:
     - Full refund to buyer
     - Release payment to seller
     - Partial refund/settlement
   - Update escrow status based on resolution

5. **Automatic Flags:**
   - Flag sellers with:
     - More than 3 disputes in 30 days
     - Delivery success rate < 80%
     - Tracking numbers that never show movement
   - Admin review required before next payout

**Deliverables:**
- Robust fraud detection system
- Fair dispute resolution process
- Buyer and seller protection mechanisms

---

### **Phase 6: Optimization & Monitoring (Week 13-14)** 📊

**Goal:** Ensure system reliability and performance

**Tasks:**
1. **Monitoring & Alerts:**
   - Set up logging for all tracking API calls
   - Monitor payout success/failure rates
   - Alert on stuck escrows (> 30 days in "held" status)
   - Alert on high dispute rates

2. **Performance Optimization:**
   - Cache tracking responses (15-minute TTL)
   - Batch tracking API calls
   - Optimize database queries with proper indexes
   - Rate limit external API calls

3. **Testing:**
   - Unit tests for escrow logic
   - Integration tests for payout flow
   - E2E tests for ship → track → deliver → payout flow
   - Load testing for batch payout processing

4. **Documentation:**
   - Seller guide: "How to ship orders"
   - Buyer guide: "How to track your order"
   - Admin guide: "Payout management"
   - Developer docs: Courier adapter implementation

**Deliverables:**
- Production-ready system with monitoring
- Comprehensive test coverage
- User documentation

---

## 6. Indian Market Specific Considerations

### 6.1 Logistics Landscape

**Top Courier Partners in India** (by market share):
1. **Delhivery** - 35% market share, comprehensive API, best for metro cities
2. **Blue Dart** (DHL) - 15% market share, premium service, fastest delivery
3. **DTDC** - 12% market share, strong in Tier 2/3 cities
4. **India Post** - 10% market share, widest reach (including remote areas)
5. **Xpressbees** - 8% market share, cost-effective
6. **Ecom Express** - 7% market share, e-commerce focused

**Recommendation:** Support all above couriers + "Other" option

### 6.2 Cash on Delivery (COD)

**Challenge:** COD is popular in India (30-40% of e-commerce orders)

**Solution Options:**
- **Option A (Recommended):** Don't support COD initially
  - Simpler escrow logic
  - Lower fraud risk
  - Prepaid-only marketplaces are growing (Grailed, StockX don't support COD)

- **Option B:** Support COD with escrow
  - Seller ships product
  - Courier collects cash from buyer
  - Courier remits cash to seller (or to platform)
  - Platform holds in escrow until delivery confirmed
  - Requires integration with courier's COD remittance systems
  - More complex, higher risk

**Recommendation:** Start without COD, add later if demand exists

### 6.3 Returns & Refunds

**Indian E-commerce Rule:** 7-day return policy mandatory for most products

**Implementation:**
- Grace period = 7 days after delivery
- During grace period:
  - Buyer can raise return request
  - Freeze payout to seller
  - Reverse logistics process initiated
  - Refund buyer after seller receives return

**Sneaker-Specific Considerations:**
- Authenticity disputes common in sneaker market
- Consider authentication service for high-value items (₹20,000+)
- Partner with authentication companies (e.g., CheckCheck, Legit App)

### 6.4 Pricing & Fees

**Platform Commission Models:**
- **Flat Fee:** ₹50-100 per order (not recommended for marketplace)
- **Percentage:** 5-10% of order value (standard for marketplaces)
- **Tiered:**
  - 0-₹5,000: 5%
  - ₹5,001-₹15,000: 7%
  - ₹15,000+: 10%

**Razorpay Fees:**
- Payment Gateway: 2% per transaction
- Razorpay Route (Payouts): ₹5 per payout + GST

**Example Calculation:**
- Sneaker sold for ₹10,000
- Buyer pays: ₹10,000 + ₹100 shipping = ₹10,100
- Platform collects: ₹10,100
- Razorpay payment fee: ₹202 (2%)
- Platform commission: ₹1,000 (10%)
- Payout fee: ₹5
- Seller receives: ₹10,100 - ₹202 - ₹1,000 - ₹5 = ₹8,893

### 6.5 Tax Compliance (GST)

**Indian Tax Requirements:**
- GST registration required if annual turnover > ₹20 lakhs
- Charge GST on platform commission (18% GST rate)
- TDS deduction for seller payouts > ₹1 lakh per year (1% TDS under Section 194O)
- Provide GST invoices and TDS certificates

**Implementation:**
- Add GST number field to seller profile
- Calculate GST on commission: `commission * 1.18`
- Deduct TDS if applicable
- Generate tax reports for compliance

---

## 7. Courier API Integration Guide

### 7.1 Delhivery API

**Documentation:** https://developers.delhivery.com/

**Key Endpoints:**
```javascript
// Track shipment
GET https://track.delhivery.com/api/v1/packages/json/?waybill={tracking_number}
Headers: {
  "Authorization": "Token {api_key}"
}

Response: {
  "ShipmentData": [{
    "Shipment": {
      "Status": { "Status": "Delivered" },
      "Scans": [
        { "ScanDetail": { "Scan": "Pickup scheduled", "ScannedLocation": "Mumbai" } }
      ]
    }
  }]
}
```

**Status Mapping:**
- "Pickup scheduled" → `pending_pickup`
- "In Transit" → `in_transit`
- "Out for Delivery" → `out_for_delivery`
- "Delivered" → `delivered`

### 7.2 Blue Dart API

**Documentation:** https://www.bluedart.com/web-api

**Note:** Requires dedicated API account (B2B customers)

**Alternative:** Use tracking page scraping for basic tracking

### 7.3 DTDC API

**Documentation:** https://www.dtdc.in/tracking-integration.asp

**Key Endpoints:**
```javascript
// Track shipment
GET https://blktracksvc.dtdc.com/dtdc-api/rest/JSONCnTrk/getTrackDetails
Params: {
  "strCnNo": "{tracking_number}",
  "Type": "PrePaid"
}
```

### 7.4 India Post API

**Documentation:** https://www.indiapost.gov.in/VAS/Pages/APIs.aspx

**Note:** API access requires registration and approval

**Alternative:** Use tracking page for manual/semi-automated tracking

### 7.5 Unified Tracking Service Implementation

```typescript
// src/lib/tracking/CourierAdapter.ts
export interface TrackingEvent {
  status: string;
  location: string;
  timestamp: string;
  description: string;
}

export interface TrackingResult {
  trackingNumber: string;
  courier: string;
  currentStatus: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  events: TrackingEvent[];
  isDelivered: boolean;
}

export interface CourierAdapter {
  name: string;
  track(trackingNumber: string): Promise<TrackingResult>;
  validateTrackingNumber(trackingNumber: string): boolean;
}

// src/lib/tracking/DelhiveryAdapter.ts
export class DelhiveryAdapter implements CourierAdapter {
  name = 'delhivery';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async track(trackingNumber: string): Promise<TrackingResult> {
    const response = await fetch(
      `https://track.delhivery.com/api/v1/packages/json/?waybill=${trackingNumber}`,
      { headers: { "Authorization": `Token ${this.apiKey}` } }
    );

    const data = await response.json();
    // Parse and transform to TrackingResult format
    return this.transformResponse(data);
  }

  validateTrackingNumber(trackingNumber: string): boolean {
    // Delhivery uses alphanumeric, typically 12-15 chars
    return /^[A-Z0-9]{10,15}$/.test(trackingNumber);
  }

  private transformResponse(data: any): TrackingResult {
    // Transform Delhivery API response to standard format
  }
}

// src/lib/tracking/TrackingService.ts
export class TrackingService {
  private adapters: Map<string, CourierAdapter>;

  constructor() {
    this.adapters = new Map([
      ['delhivery', new DelhiveryAdapter(process.env.DELHIVERY_API_KEY!)],
      ['bluedart', new BlueDartAdapter(process.env.BLUEDART_API_KEY!)],
      // ... other adapters
    ]);
  }

  async track(trackingNumber: string, courier: string): Promise<TrackingResult> {
    const adapter = this.adapters.get(courier);
    if (!adapter) {
      throw new Error(`Unsupported courier: ${courier}`);
    }

    return adapter.track(trackingNumber);
  }

  async updateShipmentStatus(shipmentId: string): Promise<void> {
    // Fetch shipment from database
    const shipment = await getShipment(shipmentId);

    // Track using appropriate courier adapter
    const result = await this.track(shipment.tracking_number, shipment.courier_partner);

    // Update database
    await updateShipment(shipmentId, {
      current_status: result.currentStatus,
      tracking_events: result.events,
      actual_delivery_date: result.actualDelivery,
      updated_at: new Date()
    });

    // If delivered, trigger escrow release
    if (result.isDelivered) {
      await handleDeliveryConfirmation(shipment.order_id);
    }
  }
}
```

---

## 8. Payment Escrow Implementation

### 8.1 Razorpay Route Setup

**Documentation:** https://razorpay.com/docs/route/

**Prerequisites:**
1. Upgrade Razorpay account to "Route" plan
2. Complete KYC for marketplace
3. Get API keys for Route

### 8.2 Escrow Flow Implementation

```typescript
// src/lib/escrow/EscrowService.ts
export class EscrowService {
  async createEscrow(orderId: string, paymentId: string, amount: number): Promise<string> {
    // Create escrow entry when payment succeeds
    const escrow = await supabase
      .from('payment_escrows')
      .insert({
        order_id: orderId,
        payment_id: paymentId,
        total_amount: amount,
        platform_fee: this.calculatePlatformFee(amount),
        seller_payout_amount: this.calculateSellerPayout(amount),
        status: 'held',
        held_at: new Date().toISOString()
      })
      .select()
      .single();

    return escrow.data.id;
  }

  async handleDeliveryConfirmation(orderId: string): Promise<void> {
    const gracePeriodDays = 7;
    const releaseEligibleAt = new Date();
    releaseEligibleAt.setDate(releaseEligibleAt.getDate() + gracePeriodDays);

    await supabase
      .from('payment_escrows')
      .update({
        release_eligible_at: releaseEligibleAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    await supabase
      .from('orders')
      .update({
        delivery_confirmed_at: new Date().toISOString(),
        grace_period_ends_at: releaseEligibleAt.toISOString()
      })
      .eq('id', orderId);
  }

  async processEligiblePayouts(): Promise<void> {
    // Called by daily cron job
    const { data: eligibleEscrows } = await supabase
      .from('payment_escrows')
      .select('*, orders(*)')
      .eq('status', 'held')
      .eq('dispute_raised', false)
      .lte('release_eligible_at', new Date().toISOString());

    for (const escrow of eligibleEscrows || []) {
      await this.releasePayment(escrow);
    }
  }

  private async releasePayment(escrow: any): Promise<void> {
    const payoutService = new PayoutService();
    await payoutService.createPayout(escrow);

    await supabase
      .from('payment_escrows')
      .update({
        status: 'released',
        released_at: new Date().toISOString()
      })
      .eq('id', escrow.id);
  }

  async handleDispute(orderId: string, reason: string): Promise<void> {
    await supabase
      .from('payment_escrows')
      .update({
        dispute_raised: true,
        dispute_raised_at: new Date().toISOString(),
        dispute_reason: reason
      })
      .eq('order_id', orderId);
  }

  private calculatePlatformFee(amount: number): number {
    // 10% platform commission
    return amount * 0.10;
  }

  private calculateSellerPayout(amount: number): number {
    const platformFee = this.calculatePlatformFee(amount);
    const payoutFee = 5; // Razorpay payout fee
    return amount - platformFee - payoutFee;
  }
}
```

### 8.3 Razorpay Payout Implementation

```typescript
// src/lib/payout/PayoutService.ts
import Razorpay from 'razorpay';

export class PayoutService {
  private razorpayX: any;

  constructor() {
    this.razorpayX = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!
    });
  }

  async createPayout(escrow: any): Promise<void> {
    const order = escrow.orders;
    const seller = await this.getSellerPaymentMethod(order.seller_id);

    if (!seller.payment_method) {
      throw new Error('Seller payment method not configured');
    }

    // Create payout record
    const { data: payout } = await supabase
      .from('seller_payouts')
      .insert({
        seller_id: order.seller_id,
        amount: escrow.seller_payout_amount,
        order_ids: [order.id],
        payment_method_id: seller.payment_method.id,
        status: 'processing'
      })
      .select()
      .single();

    try {
      // Create Razorpay payout
      const razorpayPayout = await this.razorpayX.payouts.create({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER, // Your linked account
        amount: escrow.seller_payout_amount * 100, // In paise
        currency: 'INR',
        mode: seller.payment_method.method_type === 'upi' ? 'UPI' : 'IMPS',
        purpose: 'payout',
        fund_account: {
          account_type: seller.payment_method.method_type === 'upi' ? 'vpa' : 'bank_account',
          bank_account: seller.payment_method.method_type === 'bank_account' ? {
            name: seller.payment_method.account_holder_name,
            account_number: seller.payment_method.account_number,
            ifsc: seller.payment_method.ifsc_code
          } : undefined,
          vpa: seller.payment_method.method_type === 'upi' ? {
            address: seller.payment_method.upi_id
          } : undefined
        },
        queue_if_low_balance: true,
        reference_id: payout.data.id,
        narration: `Sneaker sale payout - Order ${order.id.substring(0, 8)}`
      });

      // Update payout with Razorpay details
      await supabase
        .from('seller_payouts')
        .update({
          razorpay_payout_id: razorpayPayout.id,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', payout.data.id);

      // Send notification to seller
      await this.notifySeller(order.seller_id, escrow.seller_payout_amount);

    } catch (error) {
      // Handle payout failure
      await supabase
        .from('seller_payouts')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: error.message
        })
        .eq('id', payout.data.id);

      throw error;
    }
  }

  async batchProcess(): Promise<void> {
    // Group multiple orders per seller for batch payout
    const { data: pendingPayouts } = await supabase
      .from('payment_escrows')
      .select('*, orders(*)')
      .eq('status', 'released')
      .is('seller_payout.completed_at', null);

    // Group by seller_id
    const groupedBySeller = this.groupBySellerr(pendingPayouts);

    // Process batch payouts
    for (const [sellerId, escrows] of Object.entries(groupedBySeller)) {
      const totalAmount = escrows.reduce((sum, e) => sum + e.seller_payout_amount, 0);
      await this.createBatchPayout(sellerId, escrows, totalAmount);
    }
  }
}
```

---

## 9. Risk Mitigation Strategies

### 9.1 Fraud Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **Seller uses fake tracking number** | Validate tracking number with courier API before accepting. Real-time verification. |
| **Seller ships empty box** | Require package weight verification. Flag sellers with high dispute rates. Insurance for high-value orders. |
| **Buyer claims non-delivery falsely** | Require delivery proof from courier (signature, OTP, photo). Check courier's delivery confirmation. |
| **Buyer keeps product and requests refund** | 7-day grace period allows return window. Return shipping tracking required. |
| **Seller never ships, marks as shipped** | Track shipment movement. If no tracking updates for 48 hours, auto-cancel and refund buyer. |
| **Collusion between buyer and seller** | Monitor patterns: same buyer-seller pairs, similar addresses. Flag for manual review. |

### 9.2 Operational Risks

| Risk | Mitigation |
|------|------------|
| **Courier API downtime** | Fallback to web scraping. Manual tracking option. Cache last known status. |
| **Razorpay payout failure** | Retry logic with exponential backoff. Manual payout option for admin. Maintain payout queue. |
| **Escrow accounting errors** | Daily reconciliation reports. Automated checks: total_held + total_released = total_payments. |
| **High dispute volume** | Clear product photos/descriptions required. Authenticity guarantee for high-value items. |

### 9.3 Financial Risks

| Risk | Mitigation |
|------|------------|
| **Insufficient balance for payouts** | Monitor platform balance daily. Alert if balance < 7 days of pending payouts. |
| **Chargebacks after seller paid** | Grace period protects against early chargebacks. Insurance fund for late chargebacks. |
| **Tax compliance issues** | Automated GST/TDS calculation. Monthly reports for CA/accountant review. |

---

## 10. Timeline & Resource Estimates

### Overall Timeline: **14 weeks (3.5 months)**

### Resource Requirements:

**Development Team:**
- 1 Backend Developer (full-time) - 14 weeks
- 1 Frontend Developer (full-time) - 8 weeks
- 1 QA Engineer (part-time) - 4 weeks
- 1 DevOps Engineer (part-time) - 2 weeks

**Third-Party Services:**
- Razorpay Route account (upgrade fee: ~₹10,000 one-time + 2% per transaction)
- Courier API access:
  - Delhivery API: ₹5,000/month
  - Blue Dart API: ₹10,000/month (premium)
  - DTDC API: ₹3,000/month
- Total monthly API costs: ~₹18,000

**Estimated Development Cost:**
- Backend Developer: ₹1,50,000/month × 3.5 = ₹5,25,000
- Frontend Developer: ₹1,20,000/month × 2 = ₹2,40,000
- QA Engineer: ₹80,000/month × 1 = ₹80,000
- DevOps: ₹1,00,000/month × 0.5 = ₹50,000
- **Total Development Cost: ~₹8,95,000**

**Monthly Operational Cost:**
- Courier APIs: ₹18,000
- Razorpay fees: Variable (2% of GMV)
- Server costs: ₹10,000 (additional cron jobs, database storage)
- **Total Monthly: ~₹28,000 + 2% of GMV**

---

## 11. Success Metrics (KPIs)

### Phase 1-3 (Shipping & Tracking):
- ✅ 95%+ of orders have valid tracking numbers
- ✅ 90%+ of shipments show tracking updates within 24 hours
- ✅ <5% of orders require manual intervention

### Phase 4 (Escrow & Payouts):
- ✅ 100% of payments held in escrow until delivery
- ✅ 98%+ automated payout success rate
- ✅ Average payout time: 7-10 days after delivery

### Phase 5 (Fraud Prevention):
- ✅ Dispute rate <3% of total orders
- ✅ Fraud detection catches 95%+ of suspicious patterns
- ✅ Average dispute resolution time <3 days

### Overall Platform Health:
- ✅ Seller satisfaction score >4.0/5.0
- ✅ Buyer satisfaction score >4.5/5.0
- ✅ Successful delivery rate >95%
- ✅ Platform commission revenue target: 8-10% of GMV

---

## 12. Migration Plan from Shiprocket

### Transition Strategy: **Parallel Run**

**Week 1-2:**
- Deploy new self-shipping system to production
- Keep Shiprocket integration active (backward compatible)
- Add "Ship with Shiprocket" vs "Ship with my courier" option for sellers

**Week 3-6:**
- Monitor adoption rate of self-shipping
- Collect feedback from sellers on pain points
- Fix bugs and optimize UX based on feedback
- Gradually sunset Shiprocket by:
  - Removing Shiprocket from default options
  - Adding "Self-ship recommended" badge

**Week 7+:**
- Once 90%+ of sellers use self-shipping:
  - Mark Shiprocket integration as "legacy"
  - Stop onboarding new sellers to Shiprocket
  - Keep existing Shiprocket orders functional for tracking
- After 3 months:
  - Fully remove Shiprocket integration
  - Archive Shiprocket-related code

### Rollback Plan:
If critical issues arise during migration:
- Re-enable Shiprocket as default option
- Fix issues in self-shipping system
- Re-attempt migration after thorough testing

---

## 13. Recommended Next Steps

### Immediate Actions (This Week):
1. ✅ Review this migration plan with your team
2. ✅ Get buy-in from stakeholders
3. ✅ Set up Razorpay Route account (takes 7-10 days for KYC approval)
4. ✅ Apply for courier API access (Delhivery, Blue Dart, DTDC)
5. ✅ Finalize platform commission rate (5%, 8%, or 10%)
6. ✅ Decide on grace period duration (7 days recommended)

### Week 1 Start:
1. Create feature branch: `feature/self-shipping-migration`
2. Run database migrations (create new tables)
3. Set up edge functions for tracking and payouts
4. Begin Phase 1 implementation

### Questions to Answer Before Starting:
1. **Commission Rate:** What % will you charge sellers? (Recommend: 8-10%)
2. **Grace Period:** How many days after delivery before payout? (Recommend: 7 days)
3. **Minimum Payout:** Minimum amount before payout is processed? (Recommend: ₹500)
4. **COD Support:** Will you support Cash on Delivery? (Recommend: No, initially)
5. **Authentication:** Will you offer authentication service for high-value sneakers? (Recommend: Later phase)
6. **Insurance:** Will you offer shipping insurance? (Recommend: Optional, for orders >₹15,000)

---

## 14. Alternative Approach: Hybrid Model

If you want to keep Shiprocket as an option while adding self-shipping:

### Hybrid Model:
- **Option 1:** Seller ships using their own courier (self-shipping)
- **Option 2:** Seller uses Shiprocket (platform provides discounted rates)

### Benefits:
- Flexibility for sellers (choose based on convenience vs cost)
- Fallback option if courier APIs fail
- Gradual migration reduces risk

### Implementation:
- Add "shipping_method" field to orders: `self_ship` or `shiprocket`
- Different flows based on method selected
- Track both types of shipments in unified interface

### Recommendation:
Start with hybrid model for first 3 months, then evaluate whether to keep Shiprocket based on:
- % of sellers using each method
- Cost comparison
- Seller feedback
- Operational complexity

---

## Conclusion

This migration plan provides a **comprehensive, production-ready roadmap** to transition from Shiprocket to a self-shipping model while building a robust payment escrow system that protects both buyers and sellers.

**Key Highlights:**
- ✅ 14-week implementation timeline
- ✅ Multi-courier tracking integration (Delhivery, Blue Dart, DTDC, India Post, etc.)
- ✅ Automated payment escrow with 7-day grace period
- ✅ Razorpay Route integration for seller payouts
- ✅ Fraud prevention and dispute resolution
- ✅ Scalable architecture suitable for Indian market
- ✅ Detailed database schema and code examples

**Estimated Investment:**
- Development: ~₹9 lakhs (one-time)
- Monthly operations: ~₹28,000 + 2% of GMV

**Expected ROI:**
- Platform commission: 8-10% of GMV
- Reduced dependency on Shiprocket (saves 2-3% in aggregator fees)
- Better seller satisfaction → more listings → higher GMV

**Next Step:** Review this plan, answer the key questions in Section 13, and we can begin implementation immediately.

Let me know if you'd like me to clarify any section or want to start building Phase 1 right away! 🚀
