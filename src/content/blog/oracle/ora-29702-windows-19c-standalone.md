---
title: "ORA-29702: Error Occurred in Cluster Group Service Operation on Windows 19c Standalone"
description: "A workaround for ORA-29702 when ASM fails to start after patching Oracle Grid Infrastructure 19c on a standalone Windows host."
pubDate: 2025-06-25
tags:
- Oracle
- Grid Infrastructure
- ASM
- Windows
- Oracle 19c
- ORA-29702
---

## Problem

During a recent Grid Infrastructure migration, I encountered an issue that does not appear to be publicly documented.

The environment was configured as a **standalone Oracle Grid Infrastructure 19c** installation on Windows. The Grid Infrastructure software was installed first and configured afterward. Following the installation, ASM started normally on the base release.

After applying Grid Infrastructure patches, however, ASM no longer started successfully. The behavior was consistent across both the latest Release Updates and intermediate patch levels.

## Symptoms
The ASM instance failed to start. The following errors were reported in the Grid Infrastructure logs and when attempting to start ASM manually.

### Review the CRS log

The following entries were recorded in `crs.log`.

Example output:

```text
2025-06-20 21:00:03.677 [OCSSD(5984)]CRS-1713: CSSD daemon is started in hub mode
2025-06-20 21:00:12.740 [OCSSD(5984)]CRS-1601: CSSD Reconfiguration complete. Active nodes are srv1001 .
2025-06-20 21:00:26.006 [OCSSD(5984)]CRS-1720: Cluster Synchronization Services daemon (CSSD) is ready for operation.
2025-06-20 21:01:26.974 [ORAAGENT(1832)]CRS-5017: The resource action "ora.asm start" encountered the following error:
2025-06-20 21:01:26.974+ORA-01034: ORACLE not available
ORA-27101: shared memory realm does not exist
Process ID: 0
Session ID: 0
Serial number: 0
```

### Review the ASM alert log

The following entries were recorded in `+asm_alert.log`.

Example output:

```text
2025-06-25T08:00:33.729569-07:00
Error: Shutdown in progress. Error: 29702.
USER (ospid: 6504): terminating the instance due to ORA error 29702
2025-06-25T08:00:36.401380-07:00
Instance terminated by USER, pid = 6504
```

### Attempt to start ASM

Run the following commands:

```sql
sqlplus / as sysasm
startup
```

Example output:

```text
ORA-29702: error occurred in Cluster Group Service operation
```

## Resolution

##### 1. Stop Oracle High Availability Services

Run the following command:

```cmd
%GRID_HOME%\bin\crsctl stop has -f
```

##### 2. Rename the RAC library

Rename the following file:

```text
%GRID_HOME%\bin\orarac19.dll
```

to:

```text
%GRID_HOME%\bin\orarac19.dbl
```

##### 3. Start Oracle High Availability Services

Run the following command:

```cmd
%GRID_HOME%\bin\crsctl start has
```

##### 4. Verify the Grid Infrastructure resources

Run the following command:

```cmd
%GRID_HOME%\bin\crsctl stat res -t
```

If ASM does not start automatically, start it manually.

Run the following commands:

```sql
sqlplus / as sysasm
startup
```

## Verify the Result

Verify that the ASM instance starts successfully and the Grid Infrastructure resources are online.

Run the following command:

```cmd
%GRID_HOME%\bin\crsctl stat res -t
```

The output should show the ASM resource in the **ONLINE** state.

## Additional Information

It turns out this is actually a known issue to Oracle, although no public documentation is available on it. From what I’ve observed, applying patch triggered the RAC option to be set to **true**, even if you originally installed and configured a standalone Grid Infrastructure setup.

Because of this mismatch, ASM fails to start—it's expecting a RAC environment that doesn't exist. By renaming the binary files as mentioned above, we effectively **disable** the RAC option again, allowing ASM to start normally in the standalone configuration.

