/**
 * Map an ICAO 4-letter airport code to a country using the standard
 * 1-2 letter prefix conventions. Mirrors the backend's countryFromIcao
 * but stays compact — only the busiest regions are spelled out.
 *
 * Returns null if the code is too short or ambiguous; the caller can
 * decide whether to omit those flights from country-based grouping.
 */
export function countryFromIcao(icao: string | null | undefined): string | null {
  if (!icao || icao.length < 2) return null;
  const two = icao.substring(0, 2).toUpperCase();
  const one = icao.substring(0, 1).toUpperCase();

  const twoLetter: Record<string, string> = {
    EG: "United Kingdom", EI: "Ireland",
    LF: "France", ED: "Germany", ET: "Germany", LE: "Spain",
    LI: "Italy", LP: "Portugal", EH: "Netherlands",
    EB: "Belgium", EL: "Luxembourg", LS: "Switzerland", LO: "Austria",
    EK: "Denmark", ES: "Sweden", EN: "Norway", EF: "Finland",
    EP: "Poland", LK: "Czech Republic", LH: "Hungary",
    LR: "Romania", LG: "Greece", LT: "Turkey", LB: "Bulgaria",
    LY: "Serbia", LZ: "Slovakia", LJ: "Slovenia", LD: "Croatia",
    UU: "Russia", UL: "Russia", UR: "Russia", UH: "Russia",
    UE: "Russia", UI: "Russia", UN: "Russia", US: "Russia",
    UO: "Russia", UW: "Russia",
    UK: "Ukraine", UB: "Azerbaijan", UG: "Georgia", UD: "Armenia",
    UM: "Belarus",
    OE: "Saudi Arabia", OI: "Iran", OJ: "Jordan", OK: "Kuwait",
    OL: "Lebanon", OM: "United Arab Emirates", OO: "Oman",
    OP: "Pakistan", OR: "Iraq", OT: "Qatar", OY: "Yemen",
    OB: "Bahrain", OA: "Afghanistan", OS: "Syria",
    VA: "India", VE: "India", VI: "India", VO: "India",
    VC: "Sri Lanka", VG: "Bangladesh", VH: "Hong Kong",
    VN: "Nepal", VT: "Thailand", VV: "Vietnam", VY: "Myanmar",
    VR: "Maldives",
    WA: "Indonesia", WI: "Indonesia", WB: "Malaysia",
    WM: "Malaysia", WS: "Singapore",
    RJ: "Japan", RO: "Japan", RK: "South Korea", RP: "Philippines",
    RC: "Taiwan",
    ZB: "China", ZG: "China", ZH: "China", ZL: "China",
    ZP: "China", ZS: "China", ZU: "China", ZW: "China",
    ZY: "China", ZM: "Mongolia", ZK: "North Korea",
    FA: "South Africa", FB: "Botswana", FC: "Republic of the Congo",
    FK: "Cameroon", FL: "Zambia", FM: "Madagascar",
    FN: "Angola", FO: "Gabon", FQ: "Mozambique",
    FS: "Seychelles", FV: "Zimbabwe", FW: "Malawi", FY: "Namibia",
    FZ: "DR Congo", FI: "Mauritius",
    HE: "Egypt", HK: "Kenya", HL: "Libya", HS: "Sudan",
    HT: "Tanzania", HU: "Uganda", HA: "Ethiopia",
    DA: "Algeria", DG: "Ghana", DI: "Cote d'Ivoire",
    DN: "Nigeria", DT: "Tunisia", DR: "Niger",
    GM: "Morocco", GO: "Senegal",
    MM: "Mexico", MD: "Dominican Republic", MG: "Guatemala",
    MH: "Honduras", MK: "Jamaica", MN: "Nicaragua",
    MP: "Panama", MR: "Costa Rica", MS: "El Salvador",
    MT: "Haiti", MU: "Cuba", MY: "Bahamas", MZ: "Belize",
    SA: "Argentina", SB: "Brazil", SD: "Brazil", SI: "Brazil",
    SJ: "Brazil", SN: "Brazil", SS: "Brazil", SW: "Brazil",
    SC: "Chile", SE: "Ecuador", SG: "Paraguay", SK: "Colombia",
    SL: "Bolivia", SP: "Peru", SU: "Uruguay", SV: "Venezuela",
    SY: "Guyana",
    TJ: "Puerto Rico", TT: "Trinidad and Tobago", TX: "Bermuda",
    TF: "France (Caribbean)", TL: "Saint Lucia", TB: "Barbados",
    NZ: "New Zealand", NF: "Fiji",
    PA: "Alaska (USA)", PH: "Hawaii (USA)", PG: "Guam",
  };

  if (twoLetter[two]) return twoLetter[two];

  const oneLetter: Record<string, string> = {
    K: "United States",
    C: "Canada",
    Y: "Australia",
    B: "Iceland",
  };
  if (oneLetter[one]) return oneLetter[one];

  return null;
}
