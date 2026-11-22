/** Shared TRAKTOR contracts. Frozen: change only on main, never inside a feature branch. */

export type XY = [number, number];
export type Range = [number, number];

export type RefusalCode =
  | "ROAD_OR_CULVERT"
  | "BUILDING"
  | "FLOOD_ZONE"
  | "CHANNEL_UNRESOLVED"
  | "OUT_OF_BANK_NEIGHBOUR"
  | "SLOPE_TOO_STEEP";

export type Refusal = {
  code: RefusalCode;
  /** absent = whole site refused; present = only this crest height refused */
  crestCm?: number;
  objectRef?: string;
  distanceM?: number;
  messagePl: string;
};

export type FlagCode = "SUBSURFACE_DRAINAGE_UNKNOWN" | "OWNER_UNCONFIRMED" | "NATURA2000_UNVERIFIED";

export type CrestHeight = 20 | 30 | 40 | 50 | 60;

export type Crest = {
  heightCm: CrestHeight;
  status: "accepted" | "refused";
  refusal?: Refusal;
  storageM3: Range;
  backwaterM: number;
  rehydratedHa: Range;
  /** mm of water over the rehydration band, used for live "days of buffer" */
  storageMm: Range;
  outflowAvoidedMm: Range;
};

export type Ditch = {
  id: string;
  name: string;
  /** map space: 1000 x 640 SVG units, ~10 m per unit */
  points: XY[];
  resolvable: boolean;
};

export type Candidate = {
  id: string;
  ditchId: string;
  xy: XY;
  status: "accepted" | "refused";
  refusalCode?: RefusalCode;
};

export type Site = {
  id: string;
  ditchId: string;
  name: string;
  xy: XY;
  lat: number;
  lon: number;
  status: "accepted" | "refused";
  refusals: Refusal[];
  crests: Crest[];
  maxAcceptedCrestCm: CrestHeight | null;
  soilCategory: "I" | "II" | "III" | "IV";
  elevationM: number;
  slopePct: number;
  ditchLengthM: number;
  upstreamFieldsHa: number;
  ownParcels: string[];
  flags: FlagCode[];
  downstreamSensitive: boolean;
  /** cross-section at the weir: offsets (m) and ground elevation (m, relative to bed = 0) */
  xs: { offset: number[]; ground: number[] };
  /** long profile: chainage (m), bed and bank (m relative) */
  profile: { chainage: number[]; bed: number[]; bank: number[] };
  kowr: boolean;
  rank: number | null;
};

export type Parcel = { id: string; owner: "own" | "neighbour" | "kowr"; points: XY[] };

export type MapFeatures = {
  width: number;
  height: number;
  /** elevation band polygons, index 0 = lowest */
  elevationBands: { level: 1 | 2 | 3 | 4 | 5; points: XY[] }[];
  contours: XY[][];
  lake: XY[];
  floodZone: XY[];
  roads: { id: string; name: string; points: XY[] }[];
  buildings: { id: string; xy: XY; w: number; h: number }[];
  parcels: Parcel[];
};

export type Summary = {
  pointsAnalysed: number;
  sitesAccepted: number;
  refusalsByCode: Record<RefusalCode, number>;
  totalStorageM3: Range;
  totalRehydratedHa: Range;
};

export type ScenarioName = "drought-aug" | "storm-warning" | "spring-wet";

export type Warning = {
  kind: "meteo" | "hydro";
  event: string;
  level: 1 | 2 | 3;
  powiat: string;
  validFrom: string;
  validTo: string;
};

export type Conditions = {
  mode: "live" | "scenario" | "fixture";
  scenario?: ScenarioName;
  labelPl: string;
  asOf: string;
  month: number;
  kbw60Mm: number;
  precip72hMm: number;
  precip7dMm: number;
  et0Mm: number;
  warnings: Warning[];
  sources: string[];
};

export type OrderAction = "TRZYMAJ" | "OTWORZ" | "NIE_RUSZAJ";

export type Order = {
  siteId: string;
  action: OrderAction;
  ruleId: string;
  reasons: string[];
  inputs: Record<string, number | string>;
  deadline?: string;
  capacityFreedM3?: Range;
  consult?: boolean;
  operatorPl: string;
  expiresAt: string;
};
