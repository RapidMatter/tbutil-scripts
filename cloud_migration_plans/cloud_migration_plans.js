/*global args,client,exit,eprintln,getenv,interpolate,printJson,println,require*/
/*jslint plusplus: true*/
var plan = require("./lib/plans.js");
var utilities = require("./lib/utilities.js");

var desired_tbuilt_commit_date = utilities.tbutil_date_string_to_date_obj("2019-03-06 16:15:45 +0000");
var tbutil_commit_date = utilities.tbutil_date_string_to_date_obj(getenv("TURBO_COMMIT_DATE"));

if (tbutil_commit_date < desired_tbuilt_commit_date) {
    eprintln("Expected tbutil 1.1i or newer. Currently installed " + getenv("TURBO_BRANCH") + ". Please upgrade to use this script");
    exit(1);
}

function print_usage() {
    "use strict";
    eprintln("");
    eprintln("Usage is ..");
    eprintln("");
    eprintln("  tbscript [{cred}] cloud_migration_plans.js [-h]");
    eprintln("    [-g {vm_group_name} (The name of the VM group in Turbonomic to migrate)]");
    eprintln("    [-p {pm_group_name} (The name of the PM group in Turbonomic to migrate to. I.E. PMs_azure-East US)]");
    eprintln("");
}

var group_obj_mask = ["uuid", "className", "displayName", "groupType"],
    vm_group_name = "",
    target_pm_group_name = "",
    i = 0;

for (i = 0; i < args.length; i++) {
    if (args[i] === "-h") {
        print_usage();
        exit(0);
    }
    if (args[i] === "-g") {
        vm_group_name = args[i + 1];
    }
    if (args[i] === "-p") {
        target_pm_group_name = args[i + 1];
    }
}

var non_byol_plan_name = interpolate("(Non BYOL) Cloud Migration From ${vm_group_name} To ${target_pm_group_name}");
var byol_plan_name = interpolate("(BYOL) Cloud Migration From ${vm_group_name} To ${target_pm_group_name}");

if (vm_group_name === "") {
    eprintln("-g {vm_group_name} is required");
    print_usage();
    exit(1);
}

if (target_pm_group_name === "") {
    eprintln("-p {pm_group_name} is required");
    print_usage();
    exit(1);
}

try {
    var opts = {
        q: vm_group_name.quoteRegexpMeta(true),
        className: "Group"
    };

    // These searches could include results that *begin with* the supplied value, so
    // more than one result is okay. The first one is always chosen.

    // Find our origin group.
    println("Searching for vm group - " + vm_group_name);
    var from_grp_resp = client.getSearchResults(opts);
    if (from_grp_resp.length === 0) {
        eprintln(interpolate("Searching for group ${vm_group_name} returned ${from_grp_resp.length} results, expecting at least 1"));
        exit(2);
    }
    var from_grp = from_grp_resp[0];
    println(interpolate("Found vm group - ${vm_group_name}"));
    printJson(from_grp);

    // Find our destination group.
    println(interpolate("Searching for pm group - ${target_pm_group_name}"));
    opts.q = target_pm_group_name.quoteRegexpMeta(true);
    var to_grp_resp = client.getSearchResults(opts);
    if (to_grp_resp.length === 0) {
        eprintln(interpolate("Searching for group ${target_pm_group_name} returned ${to_grp_resp.length} results, expecting at least 1"));
        exit(3);
    }
    var to_grp = to_grp_resp[0];
    println(interpolate("Found pm group - ${target_pm_group_name}"));
    printJson(to_grp);

    var masked_from = utilities.maskObject(from_grp, group_obj_mask);
    var masked_to = utilities.maskObject(to_grp, group_obj_mask);

    var non_byol_plan_obj = new plan.CloudMigrationPlan(masked_from, masked_to, non_byol_plan_name, {});
    non_byol_plan_obj.run();
    non_byol_plan_obj.save_vm_template_mapping_csv(interpolate("${vm_group_name}_vms-to-templates-mapping-csv.csv"));
    println(interpolate("Non BYOL plan ran successfully. Plan UUID (${non_byol_plan_obj.scenario_run_response.uuid}). VM to template mapping saved to ${vm_group_name}_vms-to-templates-mapping-csv.csv"));
    non_byol_plan_obj.save_volume_mapping_csv(interpolate("${vm_group_name}_volume-tier-breakdown-csv.csv"));

    var byol_plan_obj = new plan.CloudMigrationPlan(masked_from, masked_to, byol_plan_name, {byol: true});
    byol_plan_obj.run();
    byol_plan_obj.save_vm_template_mapping_csv(interpolate("${vm_group_name}_byol-vms-to-templates-mapping-csv.csv"));
    println(interpolate("BYOL plan ran successfully. Plan UUID (${byol_plan_obj.scenario_run_response.uuid}). VM to template mapping saved to ${vm_group_name}_byol-vms-to-templates-mapping-csv.csv"));
} catch (err) {
    eprintln("An error occurred");
    printJson(err);
    exit(4);
}
