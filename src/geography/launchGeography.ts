import type { Coordinates, LaunchCounty } from "../domain/providers.ts";

export interface LaunchZipInfo {
  zip: string;
  counties: LaunchCounty[];
  primaryCounty: LaunchCounty;
  coordinates?: Coordinates;
}

const MIAMI_DADE_LAUNCH_ZIPS = [
  "33002", "33010", "33011", "33012", "33013", "33014", "33015", "33016", "33017", "33018",
  "33030", "33031", "33032", "33033", "33034", "33035", "33039", "33054", "33055", "33056",
  "33090", "33092", "33101", "33102", "33106", "33107", "33109", "33110", "33111", "33112",
  "33114", "33116", "33119", "33121", "33122", "33124", "33125", "33126", "33127", "33128",
  "33129", "33130", "33131", "33132", "33133", "33134", "33135", "33136", "33137", "33138",
  "33139", "33140", "33141", "33142", "33143", "33144", "33145", "33146", "33147", "33149",
  "33150", "33151", "33152", "33153", "33154", "33155", "33156", "33157", "33158", "33159",
  "33160", "33161", "33162", "33163", "33164", "33165", "33166", "33167", "33168", "33169",
  "33170", "33172", "33173", "33174", "33175", "33176", "33177", "33178", "33179", "33180",
  "33181", "33182", "33183", "33184", "33185", "33186", "33187", "33188", "33189", "33190",
  "33193", "33194", "33195", "33196", "33197", "33199", "33206", "33222", "33231", "33233",
  "33234", "33238", "33239", "33242", "33243", "33245", "33247", "33255", "33256", "33257",
  "33261", "33265", "33266", "33269", "33280", "33283", "33296", "33299"
] as const;

const BROWARD_LAUNCH_ZIPS = [
  "33004", "33008", "33009", "33019", "33020", "33021", "33022", "33023", "33024", "33025",
  "33026", "33027", "33028", "33029", "33060", "33061", "33062", "33063", "33064", "33065",
  "33066", "33067", "33068", "33069", "33071", "33072", "33073", "33074", "33075", "33076",
  "33077", "33081", "33082", "33083", "33084", "33093", "33097", "33196", "33301", "33302",
  "33303", "33304", "33305", "33306", "33307", "33308", "33309", "33310", "33311", "33312",
  "33313", "33314", "33315", "33316", "33317", "33318", "33319", "33320", "33321", "33322",
  "33323", "33324", "33325", "33326", "33327", "33328", "33329", "33330", "33331", "33332",
  "33334", "33335", "33336", "33337", "33338", "33339", "33340", "33345", "33346", "33348",
  "33349", "33351", "33355", "33359", "33388", "33394", "33441", "33442", "33443"
] as const;

const TRUSTED_ZIP_COORDINATES: Record<string, Coordinates> = {
  "33130": { latitude: 25.768, longitude: -80.201 },
  "33139": { latitude: 25.782, longitude: -80.134 },
  "33155": { latitude: 25.737, longitude: -80.315 },
  "33161": { latitude: 25.893, longitude: -80.182 },
  "33020": { latitude: 26.011, longitude: -80.149 },
  "33301": { latitude: 26.123, longitude: -80.143 },
  "33311": { latitude: 26.145, longitude: -80.174 },
  "33316": { latitude: 26.102, longitude: -80.136 }
};

export const LAUNCH_ZIP_DATA: Readonly<Record<string, LaunchZipInfo>> = buildLaunchZipData();

export function getLaunchZipInfo(zip: string): LaunchZipInfo | undefined {
  return LAUNCH_ZIP_DATA[normalizeZip(zip)];
}

export function isLaunchZip(zip: string): boolean {
  return Boolean(getLaunchZipInfo(zip));
}

export function classifyLaunchZip(zip?: string): LaunchCounty | undefined {
  return zip ? getLaunchZipInfo(zip)?.primaryCounty : undefined;
}

export function getLaunchZipCoordinates(zip: string): Coordinates | undefined {
  return getLaunchZipInfo(zip)?.coordinates;
}

function buildLaunchZipData(): Record<string, LaunchZipInfo> {
  const entries = new Map<string, LaunchZipInfo>();

  addCountyZips(entries, MIAMI_DADE_LAUNCH_ZIPS, "Miami-Dade");
  addCountyZips(entries, BROWARD_LAUNCH_ZIPS, "Broward");

  for (const [zip, coordinates] of Object.entries(TRUSTED_ZIP_COORDINATES)) {
    const entry = entries.get(zip);
    if (entry) {
      entry.coordinates = coordinates;
    }
  }

  return Object.fromEntries(entries);
}

function addCountyZips(
  entries: Map<string, LaunchZipInfo>,
  zips: readonly string[],
  county: LaunchCounty
) {
  for (const zip of zips) {
    const entry = entries.get(zip);
    if (!entry) {
      entries.set(zip, { zip, counties: [county], primaryCounty: county });
      continue;
    }

    if (!entry.counties.includes(county)) {
      entry.counties.push(county);
    }
  }
}

function normalizeZip(zip: string): string {
  return zip.trim();
}
