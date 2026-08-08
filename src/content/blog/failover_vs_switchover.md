---
title: "Perform a Switchover and Failover Using Oracle Data Guard Broker in Oracle Database 19c"
description: "Perform and validate switchover and failover operations in an Oracle Database 19c Data Guard configuration using Data Guard Broker."
pubDate: 2025-06-15
tags:
  - Oracle Database
  - Oracle Data Guard
  - Oracle 19c
  - Data Guard Broker
  - Switchover
  - Failover
  - High Availability
---

## Switchover and Failover Operations

Oracle Data Guard supports role transitions between the primary and standby databases. The two types of role transitions are **switchover** and **failover**.

### Switchover

A switchover is a planned role transition in which the primary database transitions to the standby role and the physical standby database transitions to the primary role.

A switchover is normally performed for planned maintenance, upgrades, or testing. When the Data Guard configuration is synchronized and healthy, the operation can be performed without data loss.

### Failover

A failover transitions a standby database to the primary role when the original primary database is unavailable or cannot continue operating.

Depending on the Data Guard protection mode and the state of redo transport and apply at the time of failure, a failover can result in data loss.

> After a failover, the former primary database cannot automatically resume its original role. It must be reinstated, when possible, or recreated as a standby database before it can rejoin the Data Guard configuration.

## Validate the Data Guard Configuration Before a Switchover

Before performing a switchover, verify the overall Data Guard Broker configuration and confirm that the standby database is ready for the role transition.

### 1. Verify the Broker Configuration

Connect to Data Guard Broker from the primary database.

Run the following commands:

```bash
[oracle@server-graz dbs]$ dgmgrl sys/*****
DGMGRL for Linux: Release 19.0.0.0.0 - Production on Sun Jun 15 19:12:37 2025
Version 19.3.0.0.0

Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.

Welcome to DGMGRL, type "help" for information.
Connected to "graz"
Connected as SYSDBA.
DGMGRL> 
```

Display the current configuration:

```bash
DGMGRL> show configuration;

Configuration - stbyconf

  Protection Mode: MaxPerformance
  Members:
  graz     - Primary database
    salzburg - Physical standby database

Fast-Start Failover:  Disabled

Configuration Status:
SUCCESS   (status updated 45 seconds ago)
```

### 2. Validate Network Connectivity

Validate Oracle Net connectivity between all members of the Data Guard configuration.


```bash
DGMGRL> validate network configuration for all;
Connecting to instance "graz" on database "graz" ...
Connected to "graz"
Checking connectivity from instance "graz" on database "graz to instance "salzburg" on database "salzburg"...
Succeeded.
Connecting to instance "salzburg" on database "salzburg" ...
Connected to "salzburg"
Checking connectivity from instance "salzburg" on database "salzburg to instance "graz" on database "graz"...
Succeeded.

Oracle Clusterware is not configured on database "graz".
Connecting to database "graz" using static connect identifier "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=server-graz)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=graz_DGMGRL)(INSTANCE_NAME=graz)(SERVER=DEDICATED)(STATIC_SERVICE=TRUE)))" ...
Succeeded.
The static connect identifier allows for a connection to database "graz".

Oracle Clusterware is not configured on database "salzburg".
Connecting to database "salzburg" using static connect identifier "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.56.20)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=salzburg_DGMGRL)(INSTANCE_NAME=salzburg)(SERVER=DEDICATED)(STATIC_SERVICE=TRUE)))" ...
Succeeded.
The static connect identifier allows for a connection to database "salzburg".
```

### 3. Validate the Standby Database

```bash
DGMGRL> validate database verbose salzburg;

  Database Role:     Physical standby database
  Primary Database:  graz

  Ready for Switchover:  Yes       <<<<<IMPORTANT!!!!!!
  Ready for Failover:    Yes (Primary Running)

  Flashback Database Status:
    graz    :  On
    salzburg:  On

  Capacity Information:
    Database  Instances        Threads
    graz      1                1
    salzburg  1                1

  Managed by Clusterware:
    graz    :  YES
    salzburg:  YES

  Temporary Tablespace File Information:
    graz TEMP Files:      1
    salzburg TEMP Files:  1

  Data file Online Move in Progress:
    graz:      No
    salzburg:  No

  Standby Apply-Related Information:
    Apply State:      Running
    Apply Lag:        0 seconds (computed 1 second ago)
    Apply Delay:      0 minutes

  Transport-Related Information:
    Transport On:  Yes
    Gap Status:    No Gap
    Transport Lag:  0 seconds (computed 1 second ago)
    Transport Status:  Success

  Log Files Cleared:
    graz Standby Redo Log Files:      Cleared
    salzburg Online Redo Log Files:   Cleared
    salzburg Standby Redo Log Files:  Available

  Current Log File Groups Configuration:
    Thread #  Online Redo Log Groups  Standby Redo Log Groups Status
              (graz)                  (salzburg)
    1         3                       4                       Sufficient SRLs

  Future Log File Groups Configuration:
    Thread #  Online Redo Log Groups  Standby Redo Log Groups Status
              (salzburg)              (graz)
    1         3                       4                       Sufficient SRLs

  Current Configuration Log File Sizes:
    Thread #   Smallest Online Redo      Smallest Standby Redo
               Log File Size             Log File Size
               (graz)                    (salzburg)
    1          200 MBytes                200 MBytes

  Future Configuration Log File Sizes:
    Thread #   Smallest Online Redo      Smallest Standby Redo
               Log File Size             Log File Size
               (salzburg)                (graz)
    1          200 MBytes                200 MBytes

  Apply-Related Property Settings:
    Property                        graz Value               salzburg Value
    DelayMins                       0                        0
    ApplyParallel                   AUTO                     AUTO
    ApplyInstances                  0                        0

  Transport-Related Property Settings:
    Property                        graz Value               salzburg Value
    LogShipping                     ON                       ON
    LogXptMode                      ASYNC                    ASYNC
    Dependency                                        
    DelayMins                       0                        0
    Binding                         optional                 optional
    MaxFailure                      0                        0
    ReopenSecs                      300                      300
    NetTimeout                      30                       30
    RedoCompression                 DISABLE                  DISABLE

DGMGRL>
```

Review the validation output and verify that the standby database is ready for a switchover.

The most important result for the planned role transition is:

```text
Database Role:     Physical standby database
Primary Database:  graz

Ready for Switchover:  Yes
Ready for Failover:    Yes (Primary Running)
```

> Do not proceed with the switchover until `Ready for Switchover` reports `Yes`.

### 4. Verify Redo Transport and Apply

Review the redo transport and apply information returned by `VALIDATE DATABASE VERBOSE`.

Verify that redo apply is running and that no apply lag is reported:

```text
Standby Apply-Related Information:
  Apply State:      Running
  Apply Lag:        0 seconds
  Apply Delay:      0 minutes
```

Verify that redo transport is enabled and that no redo gap exists:

```text
Transport-Related Information:
  Transport On:      Yes
  Gap Status:        No Gap
  Transport Lag:     0 seconds
  Transport Status:  Success
```

### 5. Verify Standby Redo Log Configuration

Verify that sufficient standby redo log groups are available for both the current and future database roles.

Example output:

```text
Current Log File Groups Configuration:
  Thread #  Online Redo Log Groups  Standby Redo Log Groups Status
            (graz)                  (salzburg)
  1         3                       4                       Sufficient SRLs

Future Log File Groups Configuration:
  Thread #  Online Redo Log Groups  Standby Redo Log Groups Status
            (salzburg)              (graz)
  1         3                       4                       Sufficient SRLs
```

The `Sufficient SRLs` status confirms that the standby redo log configuration is suitable for the current configuration and the database roles after the switchover.

### 6. Verify Flashback Database

Verify that Flashback Database is enabled on both databases.

Example output:

```text
Flashback Database Status:
  graz    : On
  salzburg: On
```

After all validation checks complete successfully and the standby database reports `Ready for Switchover: Yes`, proceed with the planned switchover.

## Perform a Switchover

After completing the validation checks and confirming that the standby database reports `Ready for Switchover: Yes`, perform the planned role transition using Oracle Data Guard Broker.

```bash
DGMGRL> switchover to salzburg;
Performing switchover NOW, please wait...
Operation requires a connection to database "salzburg"
Connecting ...
Connected to "salzburg"
Connected as SYSDBA.
New primary database "salzburg" is opening...
Oracle Clusterware is restarting database "graz" ...
Connected to "graz"
Connected to "graz"
Switchover succeeded, new primary is "salzburg"
```

Verify that `salzburg' is the new primary database.

```bash
DGMGRL> show configuration;

Configuration - stbyconf

  Protection Mode: MaxPerformance
  Members:
  salzburg - Primary database
    graz     - Physical standby database

Fast-Start Failover:  Disabled

Configuration Status:
SUCCESS   (status updated 52 seconds ago)
```

## Perform a Failover

A failover is performed when the primary database is no longer available and the physical standby database must assume the primary role.

In this example, `graz` is the current primary database and `salzburg` is the physical standby database. The failover promotes `salzburg` to the primary role.

### 1. Connect to Data Guard Broker

Connect to Data Guard Broker from the standby server.

Run the following command:

```bash
[oracle@server-salzburg dbs]$ dgmgrl sys/******
```

Verify the current Data Guard configuration:

```text
DGMGRL> show configuration;

Configuration - stbyconf

  Protection Mode: MaxPerformance
  Members:
  graz     - Primary database
    salzburg - Physical standby database

Fast-Start Failover:  Disabled

Configuration Status:
SUCCESS   (status updated 49 seconds ago)
```

### 2. Perform the Failover

Initiate the failover to the `salzburg` physical standby database.

Run the following command:

```text
DGMGRL> failover to salzburg;
```

Example output:

```text
Performing failover NOW, please wait...
Failover succeeded, new primary is "salzburg"
```

The message confirms that `salzburg` has successfully transitioned to the primary database role.

### 3. Verify the Data Guard Configuration

After the failover completes, verify the database roles.

Run the following command:

```text
DGMGRL> show configuration;
```

Example output:

```text
Configuration - stbyconf

  Protection Mode: MaxPerformance
  Members:
  salzburg - Primary database
    graz     - Physical standby database (disabled)
      ORA-16661: the standby database needs to be reinstated

Fast-Start Failover:  Disabled

Configuration Status:
SUCCESS   (status updated 53 seconds ago)
```

The output confirms that:

- `salzburg` is now the primary database.
- `graz`, the former primary database, is disabled.
- `graz` must be reinstated before it can rejoin the Data Guard configuration as a physical standby database.

## Reinstate or Recreate the Former Primary Database

After a failover, the former primary database must be reinstated or recreated before it can participate in the Data Guard configuration as a physical standby database.

If Flashback Database was enabled on the former primary before the failover, Data Guard Broker can use flashback information to reinstate the database.

If the former primary cannot be reinstated, recreate it as a physical standby database from the new primary.

In this environment, Flashback Database was enabled before the failover. Therefore, `graz` can be reinstated as a physical standby database.

### 1. Verify That the Database Requires Reinstatement

Connect to Data Guard Broker on the new primary database, `salzburg`, and display the configuration.

Run the following commands:

```bash
[oracle@server-salzburg dbs]$ dgmgrl sys/******
DGMGRL for Linux: Release 19.0.0.0.0 - Production on Sun Jun 15 20:53:05 2025
Version 19.3.0.0.0

Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.

Welcome to DGMGRL, type "help" for information.
Connected to "salzburg"
Connected as SYSDBA.
DGMGRL> show configuration;
```

Example output:

```text
Configuration - stbyconf

  Protection Mode: MaxPerformance
  Members:
  salzburg - Primary database
    graz     - Physical standby database (disabled)
      ORA-16661: the standby database needs to be reinstated

Fast-Start Failover:  Disabled

Configuration Status:
SUCCESS   (status updated 1 second ago)
```

The `ORA-16661` message indicates that the former primary database must be reinstated.

### 2. Reinstate the Former Primary Database

Reinstate `graz` as a physical standby database.

Run the following command:

```bash
DGMGRL> reinstate database graz;
```

Example output:

```bash
Reinstating database "graz", please wait...
Oracle Clusterware is restarting database "graz" ...
Connected to "graz"
Connected to "graz"
Continuing to reinstate database "graz" ...
Reinstatement of database "graz" succeeded
```

The following message confirms that the reinstatement completed successfully:

```bash
Reinstatement of database "graz" succeeded
```

### 3. Restore the Original Database Roles

After the reinstatement, `salzburg` remains the primary database and `graz` operates as the physical standby database.

If the original database roles must be restored, with `graz` as the primary database and `salzburg` as the physical standby database, first verify that the Data Guard configuration is synchronized and that `graz` reports:

```text
Ready for Switchover: Yes
```

Then perform a planned switchover back to `graz`.