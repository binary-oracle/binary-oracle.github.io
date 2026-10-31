---
title: "How to Patch Oracle APEX 24.2 in Oracle Database 19c"
description: "A step-by-step guide to applying an Oracle APEX 24.2 Patch Set Bundle in Oracle Database 19c, including PDB-specific patch scripts, Apache Tomcat, ORDS, static resources, and post-patch verification."
pubDate: 2026-10-31
tags:
  - Oracle APEX
  - Oracle Database 19c
  - Oracle Linux
  - Patching
  - Security
  - ORDS
  - Apache Tomcat
---

Oracle APEX is a web application development platform built on Oracle Database. Keeping Oracle APEX up to date with the latest patches is essential for addressing security vulnerabilities, fixing software defects, and maintaining a stable and reliable application environment.

Although Oracle APEX runs inside Oracle Database, its patching lifecycle is independent of Oracle Database Release Updates (RUs). An Oracle Database environment can be fully patched while still running an outdated Oracle APEX release.

Oracle provides **Patch Set Bundles (PSBs)** to deliver cumulative fixes for supported APEX releases without requiring a full product upgrade.

This article describes how to patch **Oracle APEX 24.2.0 to 24.2.21** using **Patch Set Bundle 37366599** in an Oracle Database 19c multitenant environment.

The environment consists of two separate servers: an Oracle Database server hosting the APEX database components and an application server running Oracle REST Data Services (ORDS) on Apache Tomcat.

The procedure covers database verification, selection of the correct patch script, patch installation, deployment of updated static resources, and post-patch verification.

The examples are based on a patching session performed on October 29, 2026. Hostnames and environment-specific identifiers have been anonymized.

## Prerequisites

Before beginning the patch installation, verify that the required access, software, and backups are available.

The environment used in this guide has the following configuration:

| Component | Configuration |
|---|---|
| Database server | `db-server01` |
| Application server | `app-server01` |
| Operating system | Oracle Linux |
| Database | Oracle Database 19c Standard Edition 2 |
| Database version | 19.33.0.0.0 |
| Container database | `cdb1` |
| Pluggable database | `APEXPDB` |
| Initial APEX version | 24.2.0 |
| Target APEX version | 24.2.21 |
| Patch Set Bundle | 37366599 |
| APEX image prefix | `/i/` |

The following prerequisites should be satisfied:

- SYSDBA access to Oracle Database.
- Operating system access to both the database and application servers.
- Access to My Oracle Support to download the patch.
- A verified database backup and documented recovery procedure.
- Sufficient filesystem space for the patch archive, extracted files, and logs.
- An approved maintenance window.
- A backup of the existing APEX static resources.
- Review of the patch-specific `README.txt`.

## Understanding Oracle APEX Patch Set Bundles

Oracle APEX Patch Set Bundles contain cumulative fixes for a particular APEX release.

For Oracle APEX 24.2, the Patch Set Bundle used in this example is **37366599**.

Oracle may update the contents of the same Patch Set Bundle as additional fixes become available. The patch number can remain unchanged while its internal patch version increases.

The patch details for this installation are:

| Property | Value |
|---|---|
| Base APEX release | 24.2.0 |
| Patch Set Bundle | 37366599 |
| Patch version | 21 |
| Resulting APEX version | 24.2.21 |

Oracle documents this Patch Set Bundle on the APEX 24.2 Known Issues page:

https://www.oracle.com/tools/downloads/apex-downloads/apex-242-known-issues/

A Patch Set Bundle updates an existing APEX release, such as 24.2.0 to 24.2.21.

This differs from a full upgrade to another APEX release family, which requires a separate upgrade procedure.

## Why Oracle APEX Patching Matters

Oracle APEX applications are commonly accessed through HTTP or HTTPS using ORDS.

Security vulnerabilities affecting APEX can therefore introduce risk even when the underlying Oracle Database has received its latest Release Update.

An example is **CVE-2026-101521**, published in Oracle's October 2026 Critical Patch Update.

Oracle assigns this vulnerability a **CVSS 3.1 base score of 9.8 (Critical)**.

The advisory identifies the following affected versions:

| Oracle APEX release | Affected versions |
|---|---|
| 24.1 | 24.1.0–24.1.21 |
| 24.2 | 24.2.0–24.2.20 |
| 26.1 | 26.1.0–26.1.4 |

The initially installed version, **24.2.0**, falls within the affected APEX 24.2 range.

Updating to **24.2.21** moves the installation outside the affected version range published in the advisory.

Official Oracle security advisory:

https://www.oracle.com/security-alerts/cpuoct2026.html#AppendixAPEX

### Security Remediation

The primary remediation is to install the appropriate Oracle-supplied security update for the affected APEX release.

For Oracle APEX 24.2, Patch Set Bundle 37366599 at patch version 21 updates APEX to 24.2.21.

The public Oracle CPU risk matrix does not provide a separate CVE-specific workaround.

Until patching can be completed, additional protective controls may be considered, such as restricting network access, limiting unnecessary public exposure, and monitoring application access logs.

These measures may reduce exposure but should not be considered substitutes for patching.

## Verify Installed Database Patches

**Server: `db-server01`**

Before installing the APEX patch, verify the database Oracle Home patch inventory.

```bash
[oracle@db-server01 ~]$ /u01/app/oracle/product/19/db_1/OPatch/opatch lspatches
39803650;OJVM RELEASE UPDATE: 19.33.0.0.261020 (39803650)
39922783;OCW RELEASE UPDATE 19.33.0.0.0 (39922783)
39915792;Database Release Update : 19.33.0.0.261020 (39915792)

OPatch succeeded.
```

This confirms that the database Oracle Home contains the October 2026 Oracle Database Release Update.

However, the presence of this database RU does not imply that Oracle APEX has been patched.

APEX must be checked separately.

## Verify Available Disk Space

**Server: `db-server01`**

Before extracting the APEX Patch Set Bundle, verify that sufficient disk space is available.

```bash
[oracle@db-server01 ~]$ df -h
Filesystem                       Size  Used Avail Use% Mounted on
devtmpfs                         4.0M     0  4.0M   0% /dev
tmpfs                            9.3G  1.2G  8.2G  12% /dev/shm
tmpfs                            3.8G  127M  3.6G   4% /run
/dev/mapper/ol_db-server01-root   30G  8.5G   20G  31% /
/dev/sda1                        2.0G  599M  1.3G  33% /boot
/dev/mapper/ol_db-server01-home  4.9G  1.4G  3.3G  30% /home
/dev/mapper/ol_db-server01-u01    97G   81G   17G  84% /u01
tmpfs                            1.9G  4.0K  1.9G   1% /run/user/0
tmpfs                            1.9G  4.0K  1.9G   1% /run/user/54321
```

## Identify the Oracle APEX Pluggable Database

**Server: `db-server01`**

Oracle APEX is installed inside a database container.

In multitenant environments, the correct PDB must be identified before checking or patching APEX.

Set the Oracle environment:

```bash
[oracle@db-server01 ~]$ . oraenv <<< cdb1
[oracle@db-server01 ~]$ sqlplus / as sysdba
```

Display the available PDBs:

```sql
SQL> show pdbs

CON_ID CON_NAME    OPEN MODE   RESTRICTED
------ ----------- ----------- ----------
2      PDB$SEED    READ ONLY   NO
3      APEXPDB     READ WRITE  NO
```

The target PDB is `APEXPDB`.

Switch to this PDB:

```sql
SQL> alter session set container=apexpdb;
Session altered.
```

All subsequent APEX-specific queries and the patch installation must target this container.

## Check the Current Oracle APEX Version

**Server: `db-server01` — SQL*Plus connected to `APEXPDB`**

Check the installed APEX version:

```sql
SQL> select version_no from apex_release;

VERSION_NO
----------
24.2.0
```

This confirms that Oracle APEX 24.2.0 is installed.

Check the existing patch history:

```sql
SQL> select patch_version,installed_on from apex_patches order by installed_on;
no rows selected
```

No previous patch records were returned at this stage.

## Download and Extract the APEX Patch Set Bundle

**Server: `db-server01`**

Oracle APEX Patch Set Bundles are available through My Oracle Support.

For Oracle APEX 24.2, search for:

```text
Patch 37366599
```

The downloaded patch used in this example was:

```text
p37366599_2420_Generic.zip
```

The patch was staged on the database server at:

```text
/u01/install/19.33/p37366599_2420_Generic.zip
```

Verify that the patch exists:

```bash
[oracle@db-server01 ~]$ ls -lh /u01/install/19.33/p37366599_2420_Generic.zip
```

Extract the patch using its full path:

```bash
[oracle@db-server01 ~]$ unzip -q /u01/install/19.33/p37366599_2420_Generic.zip -d /u01/install/19.33/
```

The extracted patch directory is:

```text
/u01/install/19.33/37366599
```

Verify the extracted files:

```bash
[oracle@db-server01 ~]$ ls -l /u01/install/19.33/37366599/
```

The patch directory contains the following important files:

```text
37366599/
├── README.txt
├── catpatch.sql
├── catpatch_con.sql
├── catpatch_appcon.sql
├── corepatch.sql
├── devpatch.sql
├── validate_apex.sql
├── images/
└── modules/
```

The important components are:

| File or directory | Purpose |
|---|---|
| `README.txt` | Patch installation instructions |
| `catpatch.sql` | Patch APEX installed in a non-CDB or in a PDB when APEX is not installed in the CDB root |
| `catpatch_con.sql` | Patch APEX installed in the CDB root |
| `catpatch_appcon.sql` | Patch APEX installed in an application container |
| `validate_apex.sql` | APEX validation |
| `images/` | Updated APEX static resources |

Review the patch README:

```bash
[oracle@db-server01 ~]$ cat /u01/install/19.33/37366599/README.txt
```

### Select the Correct Patch Script for the APEX Installation

The patch archive provides different installation scripts for different Oracle Database container configurations.

**Using a PDB does not automatically mean that `catpatch_con.sql` is required.** The deciding factor is where Oracle APEX is installed.

According to section III, step 6 of the Patch Set Bundle 37366599 README, the following scripts apply:

| APEX installation location | Patch script |
|---|---|
| Non-CDB | `catpatch.sql` |
| PDB, with APEX not installed in the CDB root | `catpatch.sql` |
| CDB root | `catpatch_con.sql` |
| Application container | `catpatch_appcon.sql` |

The script must be executed against the appropriate database container, following Oracle's patch instructions for that installation type.

In this environment, APEX is installed locally in the PDB `APEXPDB`, not in the CDB root.

Therefore, the correct patch script is:

```text
catpatch.sql
```

The other scripts are provided for different installation configurations and must not be substituted for this PDB installation.

## Restrict APEX Access During Patching

**Server: `app-server01`**

The patch README requires preventing developers and end users from accessing Oracle APEX while the patch is applied.

In this environment, ORDS runs under Apache Tomcat.

For a dedicated Tomcat instance, stop the service before executing the database patch:

```bash
[root@app-server01 ~]# systemctl stop tomcat
```

If Tomcat hosts additional applications, an approved ORDS-specific isolation method should be used instead.

The maintenance sequence should prevent access to APEX during patching and restore access only after the database patch and static-resource deployment have completed.

The supplied maintenance logs confirm a Tomcat restart, but do not establish the exact time at which application access was disabled.

## Configure the SQL Client Environment for Patching

**Server: `db-server01`**

The patch README requires the SQL client environment to use the **AL32UTF8 character set**.

Configure `NLS_LANG`:

```bash
[oracle@db-server01 ~]$ export NLS_LANG=American_America.AL32UTF8
```

The `NLS_LANG` environment variable controls the Oracle client language, territory, and character-set settings.

The `AL32UTF8` component specifies the client character set used for the SQL session.

**This setting does not change the database character set.**

Verify the configuration:

```bash
[oracle@db-server01 ~]$ echo "$NLS_LANG"
American_America.AL32UTF8
```

Navigate to the extracted patch directory:

```bash
[oracle@db-server01 ~]$ cd /u01/install/19.33/37366599
```

Connect to SQL*Plus:

```bash
[oracle@db-server01 37366599]$ sqlplus / as sysdba
```

Switch to the target PDB:

```sql
SQL> alter session set container=apexpdb;
Session altered.
```

The SQL session is now connected to the PDB containing the APEX installation.

## Apply the APEX Patch in the Target PDB

**Server: `db-server01` — SQL*Plus connected to `APEXPDB`**

Enable SQL*Plus logging:

```sql
SQL> spool /tmp/apex_24221_patch.log
```

Because APEX is installed in `APEXPDB` rather than the CDB root, execute **`catpatch.sql`** using its full path:

```sql
SQL> @/u01/install/19.33/37366599/catpatch.sql

. ORACLE
.
. Oracle APEX 24.2.%
. Patch Set Exception 37366599
........................................

APEX_VERSION
------------------------------
APEX_SCHEMA
--------------------------------------------------------------------------------
24.2.0
APEX_240200



PL/SQL procedure successfully completed.


Session altered.


APEX_SCHEMA
--------------------------------------------------------------------------------
APEX_240200


PL/SQL procedure successfully completed.

... Syncing with Post-Upgrade Job

PL/SQL procedure successfully completed.

... Disabling Jobs
... disabling ORACLE_APEX_BACKUP
... disabling ORACLE_APEX_BG_PROCESSES
... stopping job
... disabling ORACLE_APEX_DAILY_MAINTENANCE
... disabling ORACLE_APEX_DAILY_MAINT_DEV
... disabling ORACLE_APEX_DAILY_METRICS
... disabling ORACLE_APEX_DICTIONARY_CACHE
... disabling ORACLE_APEX_ISSUE_EMAILS
... disabling ORACLE_APEX_MAIL_QUEUE
... disabling ORACLE_APEX_PURGE_SESSIONS
... disabling ORACLE_APEX_WS_NOTIFICATIONS

PL/SQL procedure successfully completed.

...wwv_util_APEX_240200

Package body created.

No errors.
...validate_apex

Procedure created.

No errors.

Session altered.


PL/SQL procedure successfully completed.

...patch_37579661.sql

Table altered.


Table altered.

...patch_37859249.sql
...trigger wwv_flow_worksheet_notify_t1

Trigger created.

...patch_37859062.sql

Trigger created.

...patch_37858190.sql
...trigger wwv_flow_preferences_t1

Trigger created.


PL/SQL procedure successfully completed.

...patch_38320934.sql
...apex_appl_ai_config_rag_srcs

View created.


PL/SQL procedure successfully completed.

...patch_38726720.sql

Table altered.

...patch_38559097.sql

0 rows updated.

...patch_39039336.sql

5 rows updated.

...patch_39035104.sql

PL/SQL procedure successfully completed.


PL/SQL procedure successfully completed.

...wwv_flows_release

Function created.

...wwv_flow_imp_parser

Package body created.

No errors.
...wwv_flow

Package body created.

No errors.
...wwv_flow_cache

Package body created.

No errors.
...wwv_flow_dml

Package body created.

No errors.
...wwv_flow_utilities

Package body created.

No errors.
...wwv_flow_gen_api2

Package body created.

No errors.
...wwv_flow_meta_data

Package body created.

No errors.
...wwv_flow_provisioning

Package body created.

No errors.
wwv_render_report3.plb

Package body created.

No errors.
...wwv_dbms_cloud_int.plb

Package body created.

No errors.
...wwv_flow_ai

Package body created.

No errors.
...wwv_flow_approval

Package body created.

No errors.
...wwv_flow_authentication

Package body created.

No errors.
...wwv_flow_authentication_saml.plb

Package body created.

No errors.
...wwv_flow_authentication_social.plb

Package body created.

No errors.
...wwv_flow_authentication_native

Package body created.

No errors.
...wwv_flow_automation.plb

Package body created.

No errors.
...wwv_flow_builder

Package body created.

No errors.
...wwv_flow_branch

Package body created.

No errors.
...wwv_flow_cdn

Package body created.

No errors.
...wwv_flow_cgi.plb

Package body created.

No errors.
...wwv_flow_data_export_xml.plb

Package body created.

No errors.
...wwv_flow_dynamic_action

Package body created.

No errors.
...wwv_flow_debug

Package body created.

No errors.
...wwv_flow_error

Package body created.

No errors.
...wwv_flow_event_metrics_int.plb

Package body created.

No errors.
...wwv_flow_exec.plb

Package body created.

No errors.
...wwv_flow_exec_doc_src.plb

Package body created.

No errors.
...wwv_flow_exec_web_src_boss.plb

Package body created.

No errors.
...wwv_flow_exec_web_src_http.plb

Package body created.

No errors.
...wwv_flow_file_api

Package body created.

No errors.
...wwv_flow_fnd_developer_api

Package body created.

No errors.
...wwv_flow_hint

Package body created.

No errors.
...wwv_flow_imp_page.plb

Package body created.

No errors.
...wwv_flow_imp_shared.plb

Package body created.

No errors.
...wwv_flow_instance_admin

Package body created.

No errors.
...wwv_flow_ir

Package body created.

No errors.
...wwv_flow_ir_dialog

Package body created.

No errors.
...wwv_flow_ir_render

Package body created.

No errors.
...wwv_flow_item

Package body created.

No errors.
...wwv_flow_jwt.plb

Package body created.

No errors.
...wwv_flow_mail

Package body created.

No errors.
...wwv_flow_maint

Package body created.

No errors.
...wwv_flow_native_item

Package body created.

No errors.
...wwv_flow_page

Package body created.

No errors.
...wwv_flow_pdf

Package body created.

No errors.
...wwv_flow_print_util.plb

Package body created.

No errors.
...wwv_flow_process_bg.plb

Package body created.

No errors.
...wwv_flow_process_native

Package body created.

No errors.
...wwv_flow_public_key_util.plb

Package body created.

No errors.
...wwv_flow_pwa.plb

Package body created.

No errors.
...wwv_flow_region_native

Package body created.

No errors.
...wwv_flow_report_query.plb

Package body created.

No errors.
...wwv_flow_response.plb

Package body created.

No errors.
...wwv_flow_search.plb

Package body created.

No errors.
...wwv_flow_security

Package body created.

No errors.
...wwv_flow_session

Package body created.

No errors.
...wwv_flow_session_ras.plb

Package body created.

No errors.
...wwv_flow_session_state.plb

Package body created.

No errors.
...wwv_flow_sw_parser

Package body created.

No errors.
...wwv_flow_sw_script

Package body created.

No errors.
...wwv_flow_theme_api

Package body created.

No errors.
...wwv_flow_translation_util_api

Package body created.

No errors.
...wwv_flow_upgrade

Package body created.

No errors.
...wwv_flow_web_services

Package body created.

No errors.
...wwv_flow_web_services_invoker.plb

Package body created.

No errors.
...wwv_flow_web_src_openapi.plb

Package body created.

No errors.
...wwv_flow_web_src_sync.plb

Package body created.

No errors.
...wwv_flow_wf_management.plb

Package body created.

No errors.
...wwv_flow_workflow

Package body created.

No errors.
...wwv_flow_xml_security.plb

Package body created.

No errors.
...wwv_imp_workspace.plb

Package body created.

No errors.
...wwv_meta_meta_data

Package body created.

No errors.
...patch_37967372.sql

PL/SQL procedure successfully completed.

...patch_37830514.sql

32 rows updated.

...patch_38596648.sql

1 row updated.

...patch_38840925.sql

PL/SQL procedure successfully completed.


...Installing Universal Theme 24.2

--application/set_environment
API Last Extended:20241130
Your Current Version:20241130
This import is compatible with version: 20241130
COMPATIBLE (You should be able to run this import without issues.)
ID offset during import: 0
New ID offset for application: 0
APPLICATION 8842.242 - Universal Theme 24.2
--application/delete_application
--application/create_application
--application/user_interfaces
--application/shared_components/navigation/lists/navigation_bar
--application/shared_components/navigation/listentry
--application/plugin_settings
--application/shared_components/navigation/navigation_bar
--application/shared_components/logic/application_settings
--application/shared_components/navigation/tabs/standard
--application/shared_components/navigation/tabs/parent
--application/pages/page_groups
--application/shared_components/navigation/breadcrumbentry
--application/shared_components/user_interface/templates/page/drawer
--application/shared_components/user_interface/templates/page/master_detail
--application/shared_components/user_interface/templates/page/modal_dialog
--application/shared_components/user_interface/templates/page/login
--application/shared_components/user_interface/templates/page/wizard_modal_dialog
--application/shared_components/user_interface/templates/page/left_side_column
--application/shared_components/user_interface/templates/page/right_side_column
--application/shared_components/user_interface/templates/page/left_and_right_side_columns
--application/shared_components/user_interface/templates/page/minimal_no_navigation
--application/shared_components/user_interface/templates/page/standard
--application/shared_components/user_interface/templates/button/text_with_icon
--application/shared_components/user_interface/templates/button/icon
--application/shared_components/user_interface/templates/button/text
--application/shared_components/user_interface/templates/region/inline_popup
--application/shared_components/user_interface/templates/region/search_results_container
--application/shared_components/user_interface/templates/region/item_container
--application/shared_components/user_interface/templates/region/inline_drawer
--application/shared_components/user_interface/templates/region/image
--application/shared_components/user_interface/templates/region/alert
--application/shared_components/user_interface/templates/region/cards_container
--application/shared_components/user_interface/templates/region/interactive_report
--application/shared_components/user_interface/templates/region/wizard_container
--application/shared_components/user_interface/templates/region/buttons_container
--application/shared_components/user_interface/templates/region/content_block
--application/shared_components/user_interface/templates/region/title_bar
--application/shared_components/user_interface/templates/region/collapsible
--application/shared_components/user_interface/templates/region/inline_dialog
--application/shared_components/user_interface/templates/region/hero
--application/shared_components/user_interface/templates/region/login
--application/shared_components/user_interface/templates/region/carousel_container
--application/shared_components/user_interface/templates/region/tabs_container
--application/shared_components/user_interface/templates/region/blank_with_attributes_no_grid
--application/shared_components/user_interface/templates/region/standard
--application/shared_components/user_interface/templates/region/blank_with_attributes
--application/shared_components/user_interface/templates/list/top_navigation_tabs
--application/shared_components/user_interface/templates/list/top_navigation_mega_menu
--application/shared_components/user_interface/templates/list/wizard_progress
--application/shared_components/user_interface/templates/list/menu_bar
--application/shared_components/user_interface/templates/list/badge_list
--application/shared_components/user_interface/templates/list/media_list
--application/shared_components/user_interface/templates/list/side_navigation_menu
--application/shared_components/user_interface/templates/list/top_navigation_menu
--application/shared_components/user_interface/templates/list/navigation_bar
--application/shared_components/user_interface/templates/list/cards
--application/shared_components/user_interface/templates/list/tabs
--application/shared_components/user_interface/templates/list/menu_popup
--application/shared_components/user_interface/templates/list/links_list
--application/shared_components/user_interface/templates/report/timeline
--application/shared_components/user_interface/templates/report/content_row
--application/shared_components/user_interface/templates/report/media_list
--application/shared_components/user_interface/templates/report/value_attribute_pairs_row
--application/shared_components/user_interface/templates/report/value_attribute_pairs_column
--application/shared_components/user_interface/templates/report/badge_list
--application/shared_components/user_interface/templates/report/contextual_info
--application/shared_components/user_interface/templates/report/standard
--application/shared_components/user_interface/templates/report/comments
--application/shared_components/user_interface/templates/report/alerts
--application/shared_components/user_interface/templates/report/cards
--application/shared_components/user_interface/templates/report/search_results
--application/shared_components/user_interface/templates/label/optional_floating
--application/shared_components/user_interface/templates/label/required_floating
--application/shared_components/user_interface/templates/label/hidden
--application/shared_components/user_interface/templates/label/optional
--application/shared_components/user_interface/templates/label/required
--application/shared_components/user_interface/templates/label/optional_above
--application/shared_components/user_interface/templates/label/required_above
--application/shared_components/user_interface/templates/breadcrumb/breadcrumb
--application/shared_components/user_interface/templates/popuplov
--application/shared_components/user_interface/templates/calendar/calendar
--application/shared_components/user_interface/themes
--application/shared_components/user_interface/theme_style
--application/shared_components/user_interface/theme_files
--application/shared_components/user_interface/template_opt_groups
--application/shared_components/user_interface/template_options
--application/shared_components/globalization/language
--application/shared_components/logic/build_options
--application/shared_components/globalization/messages
--application/shared_components/globalization/dyntranslations
--application/shared_components/plugins/template_component/theme_42_avatar
--application/shared_components/plugins/template_component/theme_42_badge
--application/shared_components/plugins/template_component/theme_42_comments
--application/shared_components/plugins/template_component/theme_42_media_list
--application/shared_components/plugins/template_component/theme_42_button
--application/shared_components/plugins/template_component/theme_42_content_row
--application/shared_components/plugins/template_component/theme_42_timeline
--application/user_interfaces/combined_files
--application/deployment/definition
--application/deployment/checks
--application/deployment/buildoptions
--application/end_environment
... elapsed: 6.4 sec
...done

PL/SQL procedure successfully completed.


PL/SQL procedure successfully completed.


...done

PL/SQL procedure successfully completed.

...devpatch.sql

Session altered.


Grant succeeded.


Session altered.

...wwv_flow_copy_util

Package body created.

No errors.
...wwv_flow_generate_ddl

Package body created.

No errors.
...wwv_flow_backup.plb

Package body created.

No errors.
...wwv_flow_issue_notify_int

Package body created.

No errors.
...wwv_dictionary_cache_dev.plb

Package body created.

No errors.
...wwv_flow_ai_dev

Package body created.

No errors.
...wwv_flow_authentication_dev.plb

Package body created.

No errors.
...wwv_flow_copy_page

Package body created.

No errors.
...wwv_flow_data_profile_dev.plb

Package body created.

No errors.
...wwv_flow_doc_src_dev.plb

Package body created.

No errors.
...wwv_flow_f4000_util

Package body created.

No errors.
...wwv_flow_file_editor_dev.plb

Package body created.

No errors.
...wwv_flow_maint_dev

Package body created.

No errors.
...wwv_flow_map_region_dev.plb

Package body created.

No errors.
...wwv_flow_plugin_dev

Package body created.

No errors.
...wwv_flow_query_builder

Package body created.

No errors.
...wwv_flow_report_query_dev

Package body created.

No errors.
...wwv_flow_theme_manager.plb

Package body created.

No errors.
...wwv_flow_working_copy_dev

Package body created.

No errors.
...wwv_sample_dataset

Package body created.

No errors.
...wwv_flow_property_dev

Package body created.

No errors.
...patch_37355551.sql

PL/SQL procedure successfully completed.

...patch_37403215.sql

1 row deleted.


1 row deleted.

...patch_37377364.sql

PL/SQL procedure successfully completed.

...patch_37512460.sql

Trigger created.

...patch_36774907_dev.sql

2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


PL/SQL procedure successfully completed.

...patch_37553042_dev.sql

2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


PL/SQL procedure successfully completed.

...patch_37473871.sql

PL/SQL procedure successfully completed.

...patch_37588311_dev.sql

2 rows updated.

...patch_37809911.sql
...trigger wwv_flow_step_items_t2

Trigger created.

...patch_37751502.sql

2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.

...patch_37952347.sql

2 rows updated.

...patch_37086304.sql

2 rows updated.

...patch_37791306.sql

2 rows updated.


2 rows updated.


2 rows updated.

...patch_36293226_dev.sql

2 rows updated.

...patch_38279730_dev.sql

PL/SQL procedure successfully completed.

...patch_37155423_dev.sql

2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


PL/SQL procedure successfully completed.


2 rows updated.


2 rows updated.


PL/SQL procedure successfully completed.

...patch_38669716_dev.sql

2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.

...patch_38942013_dev.sql

PL/SQL procedure successfully completed.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.

...patch_38999603_dev.sql

2 rows updated.


2 rows updated.

...patch_39095705_dev.sql

2 rows updated.


2 rows deleted.


2 rows deleted.


2 rows updated.


2 rows deleted.


2 rows deleted.


1 row updated.


1 row deleted.


1 row deleted.

...patch_39035104_dev.sql

2 rows updated.


2 rows updated.


2 rows updated.

...patch_39241620_dev.sql

2 rows updated.


2 rows updated.

...patch_39251795_dev.sql

2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.

...patch_39370202_dev.sql

2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.


2 rows updated.

...patch_39377223_dev.sql

2 rows updated.


2 rows updated.


PL/SQL procedure successfully completed.

...patch_39368814_dev.sql

2 rows updated.


2 rows updated.

...patch_39377297_dev.sql

2 rows updated.


2 rows updated.


2 rows updated.


2 rows deleted.

...patch_39377263_dev.sql

2 rows updated.


2 rows updated.


2 rows deleted.

...patch_39377881_dev.sql

2 rows updated.


2 rows updated.

...patch_39378662_dev.sql
ID 153985439821443615: 2 rows updated.
ID 249365097716935960: 2 rows updated.
ID 154594835374686558: 2 rows updated.
ID 501157752331440928: 2 rows updated.
ID 183851252666893723: 2 rows updated.
ID 117762395154717714: 2 rows updated.
ID 815131844777112149: 2 rows updated.
ID 815131929854112150: 2 rows updated.

PL/SQL procedure successfully completed.

...patch_38543125_dev.sql

2 rows updated.


2 rows updated.


Commit complete.


PL/SQL procedure successfully completed.


PL/SQL procedure successfully completed.


PL/SQL procedure successfully completed.

...Regenerate wwv_flow_db_version if necessary
... wwv_flow_db_version is up to date

PL/SQL procedure successfully completed.

...Recompiling invalid package bodies

PL/SQL procedure successfully completed.

... Enabling Jobs
... enabling ORACLE_APEX_BACKUP
... enabling ORACLE_APEX_BG_PROCESSES
... enabling ORACLE_APEX_DAILY_MAINTENANCE
... enabling ORACLE_APEX_DAILY_MAINT_DEV
... enabling ORACLE_APEX_DAILY_METRICS
... enabling ORACLE_APEX_DICTIONARY_CACHE
... enabling ORACLE_APEX_ISSUE_EMAILS
... enabling ORACLE_APEX_MAIL_QUEUE
... enabling ORACLE_APEX_PURGE_SESSIONS
... enabling ORACLE_APEX_WS_NOTIFICATIONS

PL/SQL procedure successfully completed.

...Validating APEX
...(11:40:20) Starting validate_apex for APEX_240200
...(11:40:20) Checking missing privileges for APEX_240200
...(11:40:21) grant EXECUTE                on MDSYS.SDO_GCDR                to
APEX_240200
...(11:40:21) Checking missing privileges for APEX_GRANTS_FOR_NEW_USERS_ROLE
...(11:40:21) Re-generating APEX_240200.wwv_flow_db_version
... wwv_flow_db_version is up to date
...(11:40:22) Checking for sys.wwv_flow_cu_constraints
...(11:40:22) Checking invalid public synonyms
...(11:40:22) Key object existence check
...(11:40:22) Post-ORDS updates
...(11:40:22) calling wwv_util_apex_240200.post_ords_upgrade
...enabled_schema
...define_module
...define_template
...define_handler
...set_module_origins_allowed
...(11:40:23) Setting DBMS Registry for APEX to valid
...(11:40:23) Exiting validate_apex

PL/SQL procedure successfully completed.

...Recompiling invalid public synonyms

PL/SQL procedure successfully completed.


PL/SQL procedure successfully completed.

timing for: Complete Patch 37366599
Elapsed: 00:01:24.80

```

This confirms that the patch script recognized the existing Oracle APEX 24.2 installation.

During execution, the patch updates the APEX database objects included in the bundle.

Close the installation log:

```sql
SQL> spool off
```

The APEX patch installation is complete. The next step is to verify the resulting APEX version and patch history.

## Verify the APEX Patch Installation

Switch to the target PDB:

```sql
SQL> alter session set container=apexpdb;
```

### Verify the APEX Version

```sql
SQL> select version_no from apex_release;

VERSION_NO
----------
24.2.21
```

The installed APEX version has changed from **24.2.0** to **24.2.21**.

### Verify the Patch History

```sql
SQL> select patch_version,installed_on from apex_patches order by installed_on;

PATCH_VERSION                  INSTALLED_ON
------------------------------ -------------------
21                             2026-10-29 11:40:23
```

Verify the specific patch number:

```sql
SQL> select patch_version,
            installed_on
     from apex_patches
     where patch_number = 37366599
     order by installed_on;

PATCH_VERSION                  INSTALLED_ON
------------------------------ -------------------
21                             2026-10-29 11:40:23
```

These results confirm that Patch Set Bundle **37366599**, patch version **21**, was installed successfully.

## Verify the APEX Image Prefix

**Server: `db-server01` — SQL*Plus connected to `APEXPDB`**

Oracle APEX requires static resources such as CSS, JavaScript, images, and fonts.

These files are accessed through a configured image URL prefix.

Check the configured prefix:

```sql
SQL> select name, value from apex_instance_parameters where name = 'IMAGE_PREFIX';

NAME
------------
IMAGE_PREFIX

VALUE
------------
/i/
```

The same setting can be verified using the APEX administration API:

```sql
SQL> select apex_instance_admin.get_parameter('IMAGE_PREFIX') as image_prefix from dual;

IMAGE_PREFIX
------------
/i/
```

Both queries confirm that APEX uses:

```text
/i/
```

Because ORDS and Apache Tomcat run on a separate application server, the static resources must also be updated on that server.


## Deploy the Updated APEX Static Resources on the Application Server

**Server: `app-server01`**

In this environment, Oracle REST Data Services runs on Apache Tomcat on a separate application server.

The APEX static resources are stored in:

```text
/var/lib/tomcat/webapps/i
```

Updating the APEX database components does not automatically replace the static files on the application server.

These files must be updated separately so that they match the patched database-side APEX version.

### Connect to the Application Server

Connect to the application server:

```bash
ssh root@app-server01
```

The patch archive was available on the application server at:

```text
/tmp/p37366599_2420_Generic.zip
```

Create a staging directory:

```bash
[root@app-server01 ~]# mkdir -p /tmp/apex_patch
```

Move the patch archive into the staging directory:

```bash
[root@app-server01 ~]# mv /tmp/p37366599_2420_Generic.zip /tmp/apex_patch/
```

Extract the archive using full paths:

```bash
[root@app-server01 ~]# unzip -q /tmp/apex_patch/p37366599_2420_Generic.zip -d /tmp/apex_patch/
```

The extracted patch directory is:

```text
/tmp/apex_patch/37366599
```

Verify the static-resource directory:

```bash
[root@app-server01 ~]# ls -ld /tmp/apex_patch/37366599/images
drwxr-xr-x. 7 root root 4096 Sep 15 17:28 /tmp/apex_patch/37366599/images
```

The updated APEX static resources are now available on the application server.

### Back Up the Existing Static Resources

Before replacing the files, back up the existing APEX static resources:

```bash
[root@app-server01 ~]# cp -a /var/lib/tomcat/webapps/i /var/lib/tomcat/webapps/i.backup_24.2.0
```

Verify the backup:

```bash
[root@app-server01 ~]# ls -ld /var/lib/tomcat/webapps/i.backup_24.2.0
drwxr-xr-x. 25 tomcat tomcat 36864 Oct 20  2025 /var/lib/tomcat/webapps/i.backup_24.2.0
```

The existing static resources have been backed up.

### Copy the Updated APEX Static Resources

Copy the updated files from the patch's `images` directory into the existing Tomcat `/i` directory:

```bash
[root@app-server01 ~]# /bin/cp -af /tmp/apex_patch/37366599/images/. /var/lib/tomcat/webapps/i/
```

This command was used successfully during the maintenance session.

The `-a` option preserves source file attributes, while `-f` allows existing files to be replaced.

The trailing `/.` is important because it copies the **contents** of the `images` directory directly into the Tomcat `i` directory.

The destination is:

```text
/var/lib/tomcat/webapps/i/
```

The command does not create an additional `images` directory under `/i`.

After copying, ensure that file permissions, ownership, and SELinux contexts are appropriate for the Tomcat service.

### Verify the Static Resource Versions

Check the version in the extracted patch:

```bash
[root@app-server01 ~]# cat /tmp/apex_patch/37366599/images/apex_version.js
var gApexVersion = "24.2.21";
```

Check the version in the active Tomcat static-resource directory:

```bash
[root@app-server01 ~]# cat /var/lib/tomcat/webapps/i/apex_version.js
var gApexVersion = "24.2.21";
```

Both files report the expected version:

```text
24.2.21
```

Check the original version preserved in the backup:

```bash
[root@app-server01 ~]# cat /var/lib/tomcat/webapps/i.backup_24.2.0/apex_version.js
var gApexVersion = "24.2.0";
```

These results confirm that the original static resources were version **24.2.0** and that the active Tomcat static resources now report **24.2.21**.

### Verify the Tomcat Web Application Directory

Check the Tomcat web application path:

```bash
[root@app-server01 ~]# readlink -f /usr/share/tomcat/webapps
/var/lib/tomcat/webapps
```

Check the active web application directory:

```bash
[root@app-server01 ~]# readlink -f /var/lib/tomcat/webapps
/var/lib/tomcat/webapps
```

Both paths resolve to the same directory.

This confirms the location of the Tomcat web application directory used by this environment.

## Start Apache Tomcat After Maintenance

**Server: `app-server01`**

After the APEX patch and static-resource deployment are complete, start Apache Tomcat and verify the service.

Start the service:

```bash
[root@app-server01 ~]# systemctl start tomcat
```

Verify the service state:

```bash
[root@app-server01 ~]# systemctl is-active tomcat
active
```

Check the service details:

```bash
[root@app-server01 ~]# systemctl status tomcat
● tomcat.service - Apache Tomcat Web Application Container
     Loaded: loaded (/usr/lib/systemd/system/tomcat.service; enabled; preset: disabled)
     Active: active (running) since Thu 2026-10-29 11:47:06 CET; 15s ago
   Main PID: 213860 (java)
      Tasks: 15 (limit: 47591)
     Memory: 185.5M (peak: 185.7M)
        CPU: 13.847s
     CGroup: /system.slice/tomcat.service
             └─213860 /usr/lib/jvm/jre-21/bin/java -Djavax.sql.DataSource.Factory=org.apache.commons.dbcp.BasicDataSourceFactory -classpath /usr/share/tomcat/bin/bootstrap.jar:/usr/share/tomcat/bin/tomcat-juli.jar: -Dcatalina.base=/usr/>

Oct 29 11:47:07 app-server01 server[213860]: 29-Oct-2026 11:47:07.920 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Command line argument: -Djava.util.logging.config.file=/usr/share/tomcat/conf/logging.properties
Oct 29 11:47:07 app-server01 server[213860]: 29-Oct-2026 11:47:07.921 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Command line argument: -Djava.util.logging.manager=org.apache.juli.ClassLoaderLogManager
Oct 29 11:47:07 app-server01 server[213860]: 29-Oct-2026 11:47:07.922 INFO [main] org.apache.catalina.startup.VersionLoggerListener.log Command line argument: -Dsun.io.useCanonCaches=false
Oct 29 11:47:07 app-server01 server[213860]: 29-Oct-2026 11:47:07.930 INFO [main] org.apache.catalina.core.AprLifecycleListener.lifecycleEvent The Apache Tomcat Native library which allows using OpenSSL was not found on the java.library>
Oct 29 11:47:08 app-server01 server[213860]: 29-Oct-2026 11:47:08.994 INFO [main] org.apache.coyote.AbstractProtocol.init Initializing ProtocolHandler ["http-nio-8080"]
Oct 29 11:47:09 app-server01 server[213860]: 29-Oct-2026 11:47:09.076 INFO [main] org.apache.catalina.startup.Catalina.load Server initialization in [1728] milliseconds
Oct 29 11:47:09 app-server01 server[213860]: 29-Oct-2026 11:47:09.189 INFO [main] org.apache.catalina.core.StandardService.startInternal Starting service [Catalina]
Oct 29 11:47:09 app-server01 server[213860]: 29-Oct-2026 11:47:09.190 INFO [main] org.apache.catalina.core.StandardEngine.startInternal Starting Servlet engine: [Apache Tomcat/9.0.120]
Oct 29 11:47:09 app-server01 server[213860]: 29-Oct-2026 11:47:09.255 INFO [main] org.apache.catalina.startup.HostConfig.deployWAR Deploying web application archive [/var/lib/tomcat/webapps/ords.war]
Oct 29 11:47:11 app-server01 server[213860]: 29-Oct-2026 11:47:11.701 INFO [main] org.apache.jasper.servlet.TldScanner.scanJars At least one JAR was scanned for TLDs yet contained no TLDs. Enable debug logging for this logger for a comp>
```

The logs also showed the ORDS deployment starting:

```text
Deploying web application archive
[/var/lib/tomcat/webapps/ords.war]
```

Tomcat successfully restarted and returned to an active state.

## Verify the APEX Static Resources Through HTTP

**Server: `app-server01`**

After updating the files and restarting Tomcat, verify that the updated APEX resources are accessible through HTTP.

Execute the following command directly on the application server:

```bash
[root@app-server01 ~]# curl -i http://127.0.0.1:8080/i/apex_version.js
```

Here, `127.0.0.1` (localhost) refers to `app-server01` because the command is executed on that host.

The recorded response was:

```http
HTTP/1.1 200
Accept-Ranges: bytes
ETag: W/"30-1789486139000"
Last-Modified: Tue, 15 Sep 2026 15:28:59 GMT
Content-Type: text/javascript
Content-Length: 30
Date: Thu, 29 Oct 2026 10:52:16 GMT

var gApexVersion = "24.2.21";
```

This verifies that the updated APEX static resources are accessible through the local Tomcat HTTP endpoint.

For an additional network-level test, the application-server hostname can be used from a machine that can reach Tomcat port 8080:

```bash
curl -i http://app-server01:8080/i/apex_version.js
```

This additional command assumes that `app-server01` resolves and port 8080 is reachable remotely.

## Recommended Post-Patch Application Tests

The database and static-resource checks confirm that both layers have been updated to APEX 24.2.21.

For production maintenance, additional end-to-end testing is recommended.

### Verify the ORDS Endpoint

**Server: `app-server01`**

Test the ORDS endpoint through the local Tomcat instance:

```bash
[root@app-server01 ~]# curl -i http://127.0.0.1:8080/ords/
HTTP/1.1 302
Location: http://127.0.0.1:8080/ords/_/landing
Transfer-Encoding: chunked
Date: Sat, 31 Oct 2026 16:43:53 GMT
```

### Verify the Production HTTPS Endpoint

**Server: `app-server01` or an authorized monitoring host**

Use the actual production application hostname.

For example:

```bash
[root@app-server01 ~]# curl -i https://apex.example.com/ords/
```

Also verify the static-resource URL:

```bash
[root@app-server01 ~]# curl -i https://apex.example.com/i/apex_version.js
```

Replace `apex.example.com` with the actual production hostname.

These checks verify the application through its external HTTPS routing rather than only the local Tomcat connector.

### Verify APEX Through a Browser

Open an existing APEX application and confirm that:

- The login page loads correctly.
- JavaScript and CSS resources load without errors.
- Authentication works.
- Existing applications open successfully.
- Navigation and essential application functionality work.
- The browser developer console does not show missing resources or JavaScript errors.

These are recommended functional checks. The supplied logs confirm the local static-resource HTTP test but do not include a completed application login or browser functionality test.

### Compare the Database and Static-Resource Versions

**Database server: `db-server01`**

Connect to the target PDB and execute:

```sql
SQL> select patch_version,
            installed_on
     from apex_patches
     order by installed_on;

PATCH_VERSION                  INSTALLED_ON
------------------------------ -------------------
21                             2026-10-29 11:40:23
```

**Application server: `app-server01`**

Execute:

```bash
[root@app-server01 ~]# cat /var/lib/tomcat/webapps/i/apex_version.js

var gApexVersion = "24.2.21";
```

The APEX patch history and the deployed static-resource version are consistent with Oracle APEX 24.2.21.

## Patch Summary

| Item | Result |
|---|---|
| Initial APEX version | 24.2.0 |
| Patch Set Bundle | 37366599 |
| Patch version | 21 |
| Final APEX version | 24.2.21 |
| Database patch script | `catpatch.sql` |
| Target PDB | `APEXPDB` |
| Original static-resource version | 24.2.0 |
| Updated static-resource version | 24.2.21 |
| Tomcat HTTP static-resource response | HTTP 200 |

The database-side patch completed successfully, and the updated static resources were deployed and verified on the application server.

Both the database and Tomcat static resources now report **Oracle APEX 24.2.21**.

## Conclusion

Oracle APEX patching is an important part of maintaining a secure and reliable Oracle Database application environment.

Although APEX runs inside Oracle Database, it follows a separate patching lifecycle and requires its own Patch Set Bundles.

This procedure documents the update of **Oracle APEX 24.2.0 to 24.2.21** using **Patch Set Bundle 37366599** on Oracle Database 19c.

A critical part of the procedure is selecting the correct patch script for the APEX installation location. For an installation inside a PDB where APEX is not installed in the CDB root, Oracle specifies `catpatch.sql`. Different scripts apply to installations in the CDB root or an application container.

The installed patch was verified through the APEX release version and patch history.

The APEX static resources on the separate Apache Tomcat application server were updated after backing up the original files. The deployed resources were verified as version 24.2.21.

An HTTP request executed on `app-server01` against the local Tomcat `/i/apex_version.js` endpoint returned **HTTP 200** and confirmed that the updated static resources were served successfully.

Security advisories such as **CVE-2026-101521** highlight why APEX patching should not be overlooked, even when the underlying Oracle Database is running the latest Release Update.

For a complete production maintenance procedure, end-to-end ORDS and APEX application testing should also be performed before closing the change.

Regular version checks, timely Patch Set Bundle installation, and verification across both the database and application-server layers help maintain a secure and stable Oracle APEX environment.

## References

1. Oracle APEX 24.2 Known Issues and Patch Set Bundle  
   https://www.oracle.com/tools/downloads/apex-downloads/apex-242-known-issues/

2. Oracle APEX 24.2 Installation Guide  
   https://docs.oracle.com/en/database/oracle/apex/24.2/htmig/

3. Oracle October 2026 Critical Patch Update  
   https://www.oracle.com/security-alerts/cpuoct2026.html

4. Oracle APEX Risk Matrix — October 2026  
   https://www.oracle.com/security-alerts/cpuoct2026.html#AppendixAPEX

5. Oracle REST Data Services Documentation  
   https://docs.oracle.com/en/database/oracle/oracle-rest-data-services/

6. My Oracle Support  
   https://support.oracle.com/

7. Oracle APEX Patch Set Bundle 37366599 — `README.txt` included with the patch archive.