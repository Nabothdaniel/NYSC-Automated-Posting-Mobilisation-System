// Nigeria's 36 states + FCT, keyed by ISO 3166-2:NG code (matches public/geo/nigeria-states.geojson).
export type Zone = "NC" | "NE" | "NW" | "SE" | "SS" | "SW";
export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";

export interface StateInfo {
  code: string;
  name: string;
  zone: Zone;
  capital: string;
  lat: number;
  lng: number;
  /** Seed defaults (simulated data, editable by Security Agency users). */
  defaultRisk: RiskLevel;
  campName: string;
  defaultCampCapacity: number;
}

export const ZONE_NAMES: Record<Zone, string> = {
  NC: "North Central",
  NE: "North East",
  NW: "North West",
  SE: "South East",
  SS: "South South",
  SW: "South West",
};

export const ZONE_REGION: Record<Zone, "N" | "S"> = {
  NC: "N",
  NE: "N",
  NW: "N",
  SE: "S",
  SS: "S",
  SW: "S",
};

export const STATES: StateInfo[] = [
  { code: "AB", name: "Abia", zone: "SE", capital: "Umuahia", lat: 5.5249, lng: 7.4942, defaultRisk: "Moderate", campName: "Umunna Bende Orientation Camp", defaultCampCapacity: 1800 },
  { code: "AD", name: "Adamawa", zone: "NE", capital: "Yola", lat: 9.2035, lng: 12.4954, defaultRisk: "High", campName: "Damare Girei Orientation Camp", defaultCampCapacity: 1600 },
  { code: "AK", name: "Akwa Ibom", zone: "SS", capital: "Uyo", lat: 5.0377, lng: 7.9128, defaultRisk: "Low", campName: "Ikot Itie Udung Orientation Camp", defaultCampCapacity: 2200 },
  { code: "AN", name: "Anambra", zone: "SE", capital: "Awka", lat: 6.2104, lng: 7.0741, defaultRisk: "Moderate", campName: "Umuawulu Mbaukwu Orientation Camp", defaultCampCapacity: 2000 },
  { code: "BA", name: "Bauchi", zone: "NE", capital: "Bauchi", lat: 10.3158, lng: 9.8442, defaultRisk: "Moderate", campName: "Wailo Ganjuwa Orientation Camp", defaultCampCapacity: 1800 },
  { code: "BY", name: "Bayelsa", zone: "SS", capital: "Yenagoa", lat: 4.9247, lng: 6.2676, defaultRisk: "Moderate", campName: "Kaiama Orientation Camp", defaultCampCapacity: 1400 },
  { code: "BE", name: "Benue", zone: "NC", capital: "Makurdi", lat: 7.7337, lng: 8.5214, defaultRisk: "High", campName: "Wannune Orientation Camp", defaultCampCapacity: 1800 },
  { code: "BO", name: "Borno", zone: "NE", capital: "Maiduguri", lat: 11.8333, lng: 13.15, defaultRisk: "Critical", campName: "Maiduguri Orientation Camp", defaultCampCapacity: 1200 },
  { code: "CR", name: "Cross River", zone: "SS", capital: "Calabar", lat: 4.9757, lng: 8.3417, defaultRisk: "Low", campName: "Obubra Orientation Camp", defaultCampCapacity: 2000 },
  { code: "DE", name: "Delta", zone: "SS", capital: "Asaba", lat: 6.1985, lng: 6.7319, defaultRisk: "Moderate", campName: "Issele-Uku Orientation Camp", defaultCampCapacity: 2200 },
  { code: "EB", name: "Ebonyi", zone: "SE", capital: "Abakaliki", lat: 6.3249, lng: 8.1137, defaultRisk: "Moderate", campName: "Afikpo Orientation Camp", defaultCampCapacity: 1500 },
  { code: "ED", name: "Edo", zone: "SS", capital: "Benin City", lat: 6.335, lng: 5.6037, defaultRisk: "Moderate", campName: "Okada Orientation Camp", defaultCampCapacity: 2000 },
  { code: "EK", name: "Ekiti", zone: "SW", capital: "Ado-Ekiti", lat: 7.6211, lng: 5.2214, defaultRisk: "Low", campName: "Ise-Emure Orientation Camp", defaultCampCapacity: 1600 },
  { code: "EN", name: "Enugu", zone: "SE", capital: "Enugu", lat: 6.4584, lng: 7.5464, defaultRisk: "Moderate", campName: "Awgu Orientation Camp", defaultCampCapacity: 2000 },
  { code: "FC", name: "FCT Abuja", zone: "NC", capital: "Abuja", lat: 9.0765, lng: 7.3986, defaultRisk: "Low", campName: "Kubwa Orientation Camp", defaultCampCapacity: 3000 },
  { code: "GO", name: "Gombe", zone: "NE", capital: "Gombe", lat: 10.2897, lng: 11.1673, defaultRisk: "Moderate", campName: "Amada Orientation Camp", defaultCampCapacity: 1500 },
  { code: "IM", name: "Imo", zone: "SE", capital: "Owerri", lat: 5.485, lng: 7.035, defaultRisk: "High", campName: "Eziama Obaire Orientation Camp", defaultCampCapacity: 1800 },
  { code: "JI", name: "Jigawa", zone: "NW", capital: "Dutse", lat: 11.7562, lng: 9.3388, defaultRisk: "Moderate", campName: "Fanisau Orientation Camp", defaultCampCapacity: 1400 },
  { code: "KD", name: "Kaduna", zone: "NW", capital: "Kaduna", lat: 10.5105, lng: 7.4165, defaultRisk: "High", campName: "Kurmin Mashi Orientation Camp", defaultCampCapacity: 2000 },
  { code: "KN", name: "Kano", zone: "NW", capital: "Kano", lat: 12.0022, lng: 8.592, defaultRisk: "Moderate", campName: "Karaye Orientation Camp", defaultCampCapacity: 2400 },
  { code: "KT", name: "Katsina", zone: "NW", capital: "Katsina", lat: 12.9908, lng: 7.6018, defaultRisk: "High", campName: "Mani Orientation Camp", defaultCampCapacity: 1500 },
  { code: "KE", name: "Kebbi", zone: "NW", capital: "Birnin Kebbi", lat: 12.4539, lng: 4.1975, defaultRisk: "High", campName: "Dakingari Orientation Camp", defaultCampCapacity: 1300 },
  { code: "KO", name: "Kogi", zone: "NC", capital: "Lokoja", lat: 7.8023, lng: 6.7333, defaultRisk: "Moderate", campName: "Asaya Kabba Orientation Camp", defaultCampCapacity: 1700 },
  { code: "KW", name: "Kwara", zone: "NC", capital: "Ilorin", lat: 8.4966, lng: 4.5421, defaultRisk: "Low", campName: "Yikpata Orientation Camp", defaultCampCapacity: 1800 },
  { code: "LA", name: "Lagos", zone: "SW", capital: "Ikeja", lat: 6.6018, lng: 3.3515, defaultRisk: "Low", campName: "Iyana-Ipaja Orientation Camp", defaultCampCapacity: 3000 },
  { code: "NA", name: "Nasarawa", zone: "NC", capital: "Lafia", lat: 8.4939, lng: 8.5153, defaultRisk: "Moderate", campName: "Magaji Keffi Orientation Camp", defaultCampCapacity: 1600 },
  { code: "NI", name: "Niger", zone: "NC", capital: "Minna", lat: 9.6139, lng: 6.5569, defaultRisk: "High", campName: "Paiko Orientation Camp", defaultCampCapacity: 1600 },
  { code: "OG", name: "Ogun", zone: "SW", capital: "Abeokuta", lat: 7.1475, lng: 3.3619, defaultRisk: "Low", campName: "Sagamu Orientation Camp", defaultCampCapacity: 2200 },
  { code: "ON", name: "Ondo", zone: "SW", capital: "Akure", lat: 7.2508, lng: 5.2103, defaultRisk: "Low", campName: "Ikare-Akoko Orientation Camp", defaultCampCapacity: 1800 },
  { code: "OS", name: "Osun", zone: "SW", capital: "Osogbo", lat: 7.7827, lng: 4.5418, defaultRisk: "Low", campName: "Ede Orientation Camp", defaultCampCapacity: 1800 },
  { code: "OY", name: "Oyo", zone: "SW", capital: "Ibadan", lat: 7.3775, lng: 3.947, defaultRisk: "Low", campName: "Iseyin Orientation Camp", defaultCampCapacity: 2400 },
  { code: "PL", name: "Plateau", zone: "NC", capital: "Jos", lat: 9.8965, lng: 8.8583, defaultRisk: "High", campName: "Mangu Orientation Camp", defaultCampCapacity: 1600 },
  { code: "RI", name: "Rivers", zone: "SS", capital: "Port Harcourt", lat: 4.8156, lng: 7.0498, defaultRisk: "Moderate", campName: "Nonwa Tai Orientation Camp", defaultCampCapacity: 2400 },
  { code: "SO", name: "Sokoto", zone: "NW", capital: "Sokoto", lat: 13.0059, lng: 5.2476, defaultRisk: "High", campName: "Wamakko Orientation Camp", defaultCampCapacity: 1400 },
  { code: "TA", name: "Taraba", zone: "NE", capital: "Jalingo", lat: 8.8937, lng: 11.3596, defaultRisk: "High", campName: "Sibre Orientation Camp", defaultCampCapacity: 1300 },
  { code: "YO", name: "Yobe", zone: "NE", capital: "Damaturu", lat: 11.7469, lng: 11.9608, defaultRisk: "Critical", campName: "Damaturu Orientation Camp", defaultCampCapacity: 1100 },
  { code: "ZA", name: "Zamfara", zone: "NW", capital: "Gusau", lat: 12.1704, lng: 6.6641, defaultRisk: "Critical", campName: "Tsafe Orientation Camp", defaultCampCapacity: 1100 },
];

export const STATE_BY_CODE: Record<string, StateInfo> = Object.fromEntries(
  STATES.map((s) => [s.code, s]),
);

export const stateName = (code?: string | null) =>
  (code && STATE_BY_CODE[code]?.name) || code || "—";
