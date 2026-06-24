package com.nishanth.flight_tracker.service;

import com.nishanth.flight_tracker.dto.FlightDTO;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final FlightService flightService;

    public AnalyticsService(FlightService flightService) {
        this.flightService = flightService;
    }

    public Map<String, Object> compute() {
        List<FlightDTO> flights = flightService.getFlights();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totalFlights", flights.size());

        long celebFlights = flights.stream().filter(f -> f.getCelebrityName() != null).count();
        out.put("celebrityFlights", celebFlights);

        out.put("topDepartureCountries", topCounts(flights, f -> countryFromIcao(f.getDepartureAirport()), 10));
        out.put("topArrivalCountries", topCounts(flights, f -> countryFromIcao(f.getArrivalAirport()), 10));
        out.put("topRoutes", topRoutes(flights, 10));
        out.put("topDepartureAirports", topCounts(flights, FlightDTO::getDepartureAirport, 10));
        out.put("topArrivalAirports", topCounts(flights, FlightDTO::getArrivalAirport, 10));
        out.put("topOriginCountries", topCounts(flights, FlightDTO::getOriginCountry, 10));
        out.put("topAircraftModels", topCounts(flights, FlightDTO::getAircraftModel, 10));

        return out;
    }

    private List<Map<String, Object>> topCounts(
        List<FlightDTO> flights,
        java.util.function.Function<FlightDTO, String> extractor,
        int limit
    ) {
        Map<String, Long> counts = flights.stream()
            .map(extractor)
            .filter(Objects::nonNull)
            .filter(s -> !s.isBlank())
            .collect(Collectors.groupingBy(s -> s, Collectors.counting()));

        return counts.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(limit)
            .map(e -> {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("label", e.getKey());
                entry.put("count", e.getValue());
                return entry;
            })
            .collect(Collectors.toList());
    }

    private List<Map<String, Object>> topRoutes(List<FlightDTO> flights, int limit) {
        Map<String, Long> counts = flights.stream()
            .filter(f -> f.getDepartureAirport() != null && f.getArrivalAirport() != null)
            .map(f -> f.getDepartureAirport() + " → " + f.getArrivalAirport())
            .collect(Collectors.groupingBy(s -> s, Collectors.counting()));

        return counts.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(limit)
            .map(e -> {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("label", e.getKey());
                entry.put("count", e.getValue());
                return entry;
            })
            .collect(Collectors.toList());
    }

    /**
     * Map a 4-letter ICAO airport code to a country using the first 1-2 letters
     * (ICAO prefix conventions). Coverage is intentionally pragmatic: the busiest
     * regions are explicit, everything else falls back to a "first letter" bucket.
     */
    private static String countryFromIcao(String icao) {
        if (icao == null || icao.length() < 2) return null;
        String two = icao.substring(0, 2).toUpperCase();
        String one = icao.substring(0, 1).toUpperCase();

        // Two-letter prefixes
        switch (two) {
            case "EG": return "United Kingdom";
            case "EI": return "Ireland";
            case "LF": return "France";
            case "ED": case "ET": return "Germany";
            case "LE": return "Spain";
            case "LI": return "Italy";
            case "LP": return "Portugal";
            case "EH": return "Netherlands";
            case "EB": case "EL": return "Belgium / Luxembourg";
            case "LS": return "Switzerland";
            case "LO": return "Austria";
            case "EK": return "Denmark";
            case "ES": return "Sweden";
            case "EN": return "Norway";
            case "EF": return "Finland";
            case "EP": return "Poland";
            case "LK": return "Czech Republic";
            case "LH": return "Hungary";
            case "LR": return "Romania";
            case "LG": return "Greece";
            case "LT": return "Turkey";
            case "LB": return "Bulgaria";
            case "LY": return "Serbia / Montenegro";
            case "LZ": return "Slovakia";
            case "LJ": return "Slovenia";
            case "LD": return "Croatia";
            case "LQ": return "Bosnia and Herzegovina";
            case "UU": case "UL": case "UR": case "UH": case "UE": case "UI": case "UN": case "US": case "UO": case "UW":
                return "Russia";
            case "UK": return "Ukraine";
            case "UB": return "Azerbaijan";
            case "UG": return "Georgia";
            case "UD": return "Armenia";
            case "UM": return "Belarus";
            case "UT": return "Uzbekistan / Turkmenistan / Tajikistan";
            case "OA": return "Afghanistan";
            case "OB": return "Bahrain";
            case "OE": return "Saudi Arabia";
            case "OI": return "Iran";
            case "OJ": return "Jordan";
            case "OK": return "Kuwait";
            case "OL": return "Lebanon";
            case "OM": return "United Arab Emirates";
            case "OO": return "Oman";
            case "OP": return "Pakistan";
            case "OR": return "Iraq";
            case "OS": return "Syria";
            case "OT": return "Qatar";
            case "OY": return "Yemen";
            case "VA": case "VE": case "VI": case "VO": return "India";
            case "VC": return "Sri Lanka";
            case "VG": return "Bangladesh";
            case "VH": return "Hong Kong";
            case "VL": return "Laos";
            case "VM": return "Macau";
            case "VN": return "Nepal";
            case "VQ": return "Bhutan";
            case "VR": return "Maldives";
            case "VT": return "Thailand";
            case "VV": return "Vietnam";
            case "VY": return "Myanmar";
            case "WA": case "WI": return "Indonesia";
            case "WB": return "Malaysia (East)";
            case "WM": return "Malaysia (West)";
            case "WS": return "Singapore";
            case "WP": return "Timor-Leste";
            case "RJ": return "Japan";
            case "RK": return "South Korea";
            case "RO": return "Japan (Okinawa)";
            case "RP": return "Philippines";
            case "RC": return "Taiwan";
            case "ZB": case "ZG": case "ZH": case "ZL": case "ZP": case "ZS": case "ZU": case "ZW": case "ZY":
                return "China";
            case "ZM": return "Mongolia";
            case "ZK": return "North Korea";
            case "FA": return "South Africa";
            case "FB": return "Botswana";
            case "FC": return "Republic of the Congo";
            case "FD": return "Eswatini";
            case "FE": return "Central African Republic";
            case "FG": return "Equatorial Guinea";
            case "FH": return "Saint Helena";
            case "FI": return "Mauritius";
            case "FJ": return "British Indian Ocean";
            case "FK": return "Cameroon";
            case "FL": return "Zambia";
            case "FM": return "Madagascar / Comoros";
            case "FN": return "Angola";
            case "FO": return "Gabon";
            case "FP": return "Sao Tome and Principe";
            case "FQ": return "Mozambique";
            case "FS": return "Seychelles";
            case "FT": return "Chad";
            case "FV": return "Zimbabwe";
            case "FW": return "Malawi";
            case "FX": return "Lesotho";
            case "FY": return "Namibia";
            case "FZ": return "Democratic Republic of the Congo";
            case "GA": return "Mali";
            case "GB": return "The Gambia";
            case "GC": case "GE": return "Spain (Canary Islands)";
            case "GF": return "Sierra Leone";
            case "GG": return "Guinea-Bissau";
            case "GL": return "Liberia";
            case "GM": return "Morocco";
            case "GO": return "Senegal";
            case "GQ": return "Mauritania";
            case "GS": return "Western Sahara";
            case "GU": return "Guinea";
            case "GV": return "Cape Verde";
            case "HA": return "Ethiopia";
            case "HB": return "Burundi";
            case "HC": return "Somalia";
            case "HD": return "Djibouti";
            case "HE": return "Egypt";
            case "HH": return "Eritrea";
            case "HK": return "Kenya";
            case "HL": return "Libya";
            case "HR": return "Rwanda";
            case "HS": return "Sudan";
            case "HT": return "Tanzania";
            case "HU": return "Uganda";
            case "DA": return "Algeria";
            case "DB": return "Benin";
            case "DF": return "Burkina Faso";
            case "DG": return "Ghana";
            case "DI": return "Cote d'Ivoire";
            case "DN": return "Nigeria";
            case "DR": return "Niger";
            case "DT": return "Tunisia";
            case "DX": return "Togo";
            case "MM": return "Mexico";
            case "MB": return "Turks and Caicos";
            case "MD": return "Dominican Republic";
            case "MG": return "Guatemala";
            case "MH": return "Honduras";
            case "MK": return "Jamaica";
            case "MN": return "Nicaragua";
            case "MP": return "Panama";
            case "MR": return "Costa Rica";
            case "MS": return "El Salvador";
            case "MT": return "Haiti";
            case "MU": return "Cuba";
            case "MW": return "Cayman Islands";
            case "MY": return "Bahamas";
            case "MZ": return "Belize";
            case "SA": return "Argentina";
            case "SB": case "SD": case "SI": case "SJ": case "SN": case "SS": case "SW":
                return "Brazil";
            case "SC": return "Chile";
            case "SE": return "Ecuador";
            case "SG": return "Paraguay";
            case "SK": return "Colombia";
            case "SL": return "Bolivia";
            case "SM": return "Suriname";
            case "SO": return "French Guiana";
            case "SP": return "Peru";
            case "SU": return "Uruguay";
            case "SV": return "Venezuela";
            case "SY": return "Guyana";
            case "TA": return "Antigua and Barbuda";
            case "TB": return "Barbados";
            case "TD": return "Dominica";
            case "TF": return "France (Caribbean)";
            case "TG": return "Grenada";
            case "TI": return "U.S. Virgin Islands";
            case "TJ": return "Puerto Rico";
            case "TK": return "Saint Kitts and Nevis";
            case "TL": return "Saint Lucia";
            case "TN": return "Caribbean Netherlands";
            case "TQ": return "Anguilla";
            case "TR": return "Montserrat";
            case "TT": return "Trinidad and Tobago";
            case "TU": return "British Virgin Islands";
            case "TV": return "Saint Vincent and the Grenadines";
            case "TX": return "Bermuda";
            case "NC": return "Cook Islands";
            case "NF": return "Fiji / Tonga";
            case "NG": return "Kiribati / Tuvalu";
            case "NI": return "Niue";
            case "NL": return "Wallis and Futuna";
            case "NS": return "Samoa";
            case "NT": return "French Polynesia";
            case "NV": return "Vanuatu";
            case "NW": return "New Caledonia";
            case "NZ": return "New Zealand";
            case "PA": return "Alaska, USA";
            case "PH": return "Hawaii, USA";
            case "PG": return "Guam";
            default:
                break;
        }

        // Single-letter fallbacks
        switch (one) {
            case "K": return "United States";
            case "C": return "Canada";
            case "Y": return "Australia";
            case "B": return "Greenland / Iceland";
            default: return "Other";
        }
    }
}
