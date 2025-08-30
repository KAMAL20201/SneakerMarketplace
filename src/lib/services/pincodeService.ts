import type { PincodeData } from "../../types/shipping";

export class PincodeService {
  private static readonly API_BASE = "https://api.postalpincode.in/pincode";

  /**
   * Validate and lookup pincode details
   * @param pincode - 6-digit Indian pincode
   * @returns Promise<PincodeData | null>
   */
  static async lookupPincode(pincode: string): Promise<PincodeData | null> {
    try {
      // Basic validation
      if (!/^[1-9][0-9]{5}$/.test(pincode)) {
        throw new Error("Invalid pincode format");
      }

      const response = await fetch(`${this.API_BASE}/${pincode}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
        const postOffice = data[0].PostOffice[0];

        return {
          city: postOffice.District || postOffice.Name,
          state: postOffice.State,
          district: postOffice.District,
          postOffice: postOffice.Name,
        };
      } else {
        throw new Error("Pincode not found");
      }
    } catch (error) {
      console.error("Pincode lookup failed:", error);
      return null;
    }
  }

  /**
   * Validate pincode format without API call
   * @param pincode - pincode to validate
   * @returns boolean
   */
  static validateFormat(pincode: string): boolean {
    return /^[1-9][0-9]{5}$/.test(pincode);
  }

  /**
   * Get state suggestions based on pincode
   * @param pincode - first 2 digits of pincode
   * @returns string[]
   */
  static getStateSuggestions(pincode: string): string[] {
    const firstTwo = pincode.substring(0, 2);

    // Pincode ranges for Indian states (simplified)
    const stateRanges: Record<string, string[]> = {
      "11": ["Delhi"],
      "12": ["Haryana"],
      "13": ["Uttar Pradesh"],
      "14": ["Punjab"],
      "20": ["Maharashtra"],
      "21": ["Maharashtra"],
      "22": ["Maharashtra"],
      "23": ["Maharashtra"],
      "30": ["Rajasthan"],
      "31": ["Rajasthan"],
      "32": ["Rajasthan"],
      "33": ["Rajasthan"],
      "34": ["Rajasthan"],
      "40": ["Gujarat"],
      "41": ["Gujarat"],
      "42": ["Gujarat"],
      "43": ["Gujarat"],
      "44": ["Gujarat"],
      "50": ["Telangana", "Andhra Pradesh"],
      "51": ["Telangana", "Andhra Pradesh"],
      "52": ["Telangana", "Andhra Pradesh"],
      "53": ["Telangana", "Andhra Pradesh"],
      "56": ["Karnataka"],
      "57": ["Karnataka"],
      "58": ["Karnataka"],
      "59": ["Karnataka"],
      "60": ["Tamil Nadu"],
      "61": ["Tamil Nadu"],
      "62": ["Tamil Nadu"],
      "63": ["Tamil Nadu"],
      "67": ["Kerala"],
      "68": ["Kerala"],
      "69": ["Kerala"],
      "70": ["West Bengal"],
      "71": ["West Bengal"],
      "72": ["West Bengal"],
      "73": ["West Bengal"],
      "74": ["West Bengal"],
      "75": ["Madhya Pradesh"],
      "76": ["Madhya Pradesh"],
      "77": ["Madhya Pradesh"],
      "78": ["Madhya Pradesh"],
      "79": ["Madhya Pradesh"],
      "80": ["Bihar"],
      "81": ["Bihar"],
      "82": ["Bihar"],
      "83": ["Bihar"],
      "84": ["Bihar"],
      "85": ["Jharkhand"],
      "86": ["Jharkhand"],
      "87": ["Jharkhand"],
      "88": ["Jharkhand"],
      "89": ["Jharkhand"],
      "90": ["Uttar Pradesh"],
      "91": ["Uttar Pradesh"],
      "92": ["Uttar Pradesh"],
      "93": ["Uttar Pradesh"],
      "94": ["Uttar Pradesh"],
      "95": ["Uttar Pradesh"],
      "96": ["Uttar Pradesh"],
      "97": ["Uttar Pradesh"],
      "98": ["Uttar Pradesh"],
      "99": ["Uttar Pradesh"],
    };

    return stateRanges[firstTwo] || [];
  }
}
