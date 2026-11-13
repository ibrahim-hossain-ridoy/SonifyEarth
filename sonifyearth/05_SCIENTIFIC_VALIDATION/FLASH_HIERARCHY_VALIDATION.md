# Flash Hierarchy & Parent-Child Record Integrity Validation
**SonifyEarth — Task 3: Scientific Validation**  
*Generated: November 11, 2026*  
*Source Artifact: [`flash_hierarchy_validation/flash_hierarchy_checks.csv`](05_SCIENTIFIC_VALIDATION/flash_hierarchy_validation/flash_hierarchy_checks.csv)*

---

## 1. Executive Summary

- **Granules Tested**: All 106 Science V2.2 files.
- **Total Records Validated**:
  - **16,124 Flashes**
  - **144,611 Groups**
  - **549,106 Events**
- **Indexing Errors Found**: **0** across all 709,841 hierarchical records.
- **Status**: **VALIDATED (PASS 100%)**.

---

## 2. Empirical Indexing Architecture & Offsets

In NASA's NetCDF-4 conversion of original HDF4 LIS structures, every parent-child pointer was tested for off-by-one errors, array boundary overflows, and bi-directional consistency:

1. **Indexing Base**: Strictly **0-indexed** contiguous array slicing.
   - For any flash $i$, its constituent groups lie strictly at slice:
     $$\text{Groups}(i) = \mathtt{lightning\_group\_*}[\mathtt{child\_addr}[i] \ : \ \mathtt{child\_addr}[i] + \mathtt{child\_count}[i]]$$
   - For any group $j$, its constituent optical pixel events lie strictly at slice:
     $$\text{Events}(j) = \mathtt{lightning\_event\_*}[\mathtt{child\_addr}[j] \ : \ \mathtt{child\_addr}[j] + \mathtt{child\_count}[j]]$$
2. **Bi-Directional Pointer Verification**:
   - Every child group's `lightning_group_parent_address` matches its parent flash's `lightning_flash_address` (0 mismatches across 144,611 groups).
   - Every child event's `lightning_event_parent_address` matches its parent group's `lightning_group_address` (0 mismatches across 549,106 events).
3. **Temporal Synchronization**:
   - Every flash's `lightning_flash_TAI93_time` matches its first child group's `lightning_group_TAI93_time` within $\le 2\text{ ms}$ (0 discrepancies across 16,124 flashes).

---

## 3. Aggregate Validation Table

| Metric | Count Tested | Errors / Mismatches | Status |
| :--- | :---: | :---: | :---: |
| Flash $\to$ Group Child Boundary Checks | 16,124 | **0** | **PASS** |
| Group $\to$ Flash Parent Pointer Checks | 144,611 | **0** | **PASS** |
| Group $\to$ Event Child Boundary Checks | 144,611 | **0** | **PASS** |
| Event $\to$ Group Parent Pointer Checks | 549,106 | **0** | **PASS** |
| Flash vs. First Group Timestamp Sync ($\le 2\text{ ms}$) | 16,124 | **0** | **PASS** |

---

## 4. Significance for Evidence Traceability

The *"Why Did I Hear That?"* evidence inspector can reliably drill down from any audible Flash trigger down to its constituent strokes (Groups) and raw $128 \times 128$ CCD pixel events without risk of offset drift or corrupted pointer lookups.

