# Geography data

MechanicMatchFL uses the U.S. Census Bureau 2026 ZIP Code Tabulation Area
(ZCTA) Gazetteer file for representative ZIP-area latitude and longitude.
Only records corresponding to the Miami-Dade and Broward launch ZIP list are
stored in `src/geography/censusZcta2026Centroids.ts`.

## Source and license

- Publisher: U.S. Census Bureau, Geography Division
- Dataset: 2026 Gazetteer, ZIP Code Tabulation Areas
- Download: https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2026_Gazetteer/2026_Gaz_zcta_national.zip
- Record fields: `GEOID`, `INTPTLAT`, and `INTPTLONG`
- Download SHA-256: `F1E9046B91F6E60686A99343CB2752834C02B0764939403B331C78C017E2C54C`
- Retrieved: 2026-10-29
- Use terms: Census Bureau employee works generally are not subject to U.S.
  copyright protection. The project attributes the Bureau as the source and
  treats conclusions from the data as MechanicMatchFL's responsibility.

Official references:

- https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html
- https://www.census.gov/programs-surveys/geography/technical-documentation/records-layout/gaz-record-layouts.html
- https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html
- https://www.census.gov/about/policies/citation.html

## Extraction and limitations

The national pipe-delimited file was filtered by exact `GEOID` membership in
the launch ZIP list. Coordinates are copied without interpolation or manual
adjustment. Tests verify representative source values and the launch extract.

ZCTAs are Census statistical approximations of USPS ZIP service areas, not
delivery boundaries. PO-box and other nonresidential ZIPs may not have a ZCTA.
Those ZIPs remain recognized as launch-area ZIPs but are not eligible for
distance or radius matching. The application explains this limitation and
returns no inferred geographic matches rather than inventing a centroid.

ZIP `33196` appears in both legacy county lists. Matching uses the trusted
centroid and distance, never the county label, so county-border proximity works
without assigning service eligibility from county membership.

## Matching policy

- Physical shops qualify when their trusted shop-ZIP centroid is no more than
  30 straight-line miles from the requested ZIP centroid.
- Mobile mechanics qualify only for an explicitly declared service ZIP or when
  the requested ZIP centroid is within the declared radius of a trusted base
  ZIP centroid.
- County fields are descriptive and retained for legacy compatibility. They do
  not establish mobile service coverage or physical-shop proximity.
