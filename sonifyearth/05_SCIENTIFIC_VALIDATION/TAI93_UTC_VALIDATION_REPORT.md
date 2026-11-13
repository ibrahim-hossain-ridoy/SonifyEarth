# TAI93 to UTC Time Conversion Validation Report
**SonifyEarth — Task 3: Scientific Validation**  
*Generated: November 11, 2026*  
*Source Artifact: [`time_validation/tai93_conversion_checks.csv`](05_SCIENTIFIC_VALIDATION/time_validation/tai93_conversion_checks.csv)*

---

## 1. Executive Summary

- **Files Tested**: 106 out of 106 Science V2.2 files + 16,124 lightning flash timestamps.
- **Conversion Accuracy**: **0.000000000 seconds maximum error** across all 106 granules.
- **Status**: **VALIDATED (PASS 100%)**.

---

## 2. Exact TAI93 Epoch Definition & Leap-Second Math

In NASA LIS NetCDF-4 metadata, `TAI93` variables carry the unit attribute:
> `seconds since 1993-01-01 00:00:00.000`

However, `TAI93` counts **International Atomic Time (TAI)** SI seconds, which do not pause or adjust for Earth rotation leap seconds, whereas standard ISO-8601 `UTC` timestamps do insert leap seconds:
- At the `TAI93` epoch (`1993-01-01 00:00:00 UTC`), the cumulative offset between TAI and UTC was **27 seconds**.
- By November 2023 (our mission week), the cumulative offset between TAI and UTC was **37 seconds**.
- Therefore, the net number of leap seconds inserted into UTC **between 1993-01-01 and November 2023** is:
  $$\Delta_{\text{leap}} = 37 - 27 = \mathbf{10\text{ seconds}}$$
  Specifically, leap seconds were inserted on: `1993-06-30`, `1994-06-30`, `1995-12-31`, `1997-06-30`, `1998-12-31`, `2005-12-31`, `2008-12-31`, `2012-06-30`, `2015-06-30`, and `2016-12-31`.

### Conversion Equation
$$\text{UTC} = \text{Epoch}_{1993\text{-}01\text{-}01} + (\text{TAI93} - 10.0\text{ seconds})$$

*(Note: A naive subtraction of 37 seconds would have introduced a catastrophic 27-second systematic clock error. This leap-second-aware validation proves the exact offset is 10.000000 seconds for 2023).*

---

## 3. Empirical Cross-Check Against NASA UTC Metadata

Every single Science and Backgrounds file embeds a reference UTC timestamp (`orbit_summary_UTC_start` and `bg_orbit_summary_UTC_start`) alongside `orbit_summary_TAI93_start`.

| Granule Index | Science Filename | `orbit_summary_TAI93_start` | Official `orbit_summary_UTC_start` | Converted UTC (`TAI93 - 10s`) | Error (s) |
| :---: | :--- | :---: | :--- | :--- | :---: |
| 1 | `ISS_LIS_SC_V2.2_20231109_225212_FIN.nc` | `973723942.4` | `2023-11-09T22:52:12.400000Z` | `2023-11-09T22:52:12.400000Z` | `0.000000` |
| 26 | `ISS_LIS_SC_V2.2_20231111_164002_FIN.nc` | `973874412.4` | `2023-11-11T16:40:02.400000Z` | `2023-11-11T16:40:02.400000Z` | `0.000000` |
| 51 | `ISS_LIS_SC_V2.2_20231113_072211_FIN.nc` | `974013741.4` | `2023-11-13T07:22:11.400000Z` | `2023-11-13T07:22:11.400000Z` | `0.000000` |
| 76 | `ISS_LIS_SC_V2.2_20231114_220417_FIN.nc` | `974153067.3` | `2023-11-14T22:04:17.300000Z` | `2023-11-14T22:04:17.300000Z` | `0.000000` |
| 106 | `ISS_LIS_SC_V2.2_20231116_203042_FIN.nc` | `974320252.4` | `2023-11-16T20:30:42.400000Z` | `2023-11-16T20:30:42.400000Z` | `0.000000` |

- **Maximum error across all 106 granules**: `0.000000000 seconds`.
- **Intra-granule Flash Timestamps**: All **16,124** flash timestamps (`lightning_flash_TAI93_time`) fall strictly inside `[orbit_summary_TAI93_start, orbit_summary_TAI93_end]` (0 out-of-bounds).

---

## 4. Preservation Rule & Tolerance

1. **Raw Value Preservation**: Original float64 `TAI93` timestamps are retained unmodified in all internal datasets and evidence records.
2. **Conversion Tolerance**: Tolerance is $\le 1\text{ microsecond}$ for granule metadata and $\le 2\text{ ms}$ (1 LIS optical integration frame) for flash scheduling.

