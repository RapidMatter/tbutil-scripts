/*globals require*/
var plan = require("./lib/plans.js");
var utilities = require("./lib/utilities.js");

var plan_uuid = "";
for (var i = 0; i < args.length; i++) {
    if (args[i] === "-i") {
        plan_uuid = args[i + 1];
    }
}

var plan_obj = new plan.CloudMigrationPlan({}, {}, "foo", {});
// TODO: Take this as a parameter, to allow fetching this for an existing plan.
plan_obj.scenario_run_response.uuid = plan_uuid;
plan_obj.wait();

plan_obj.save_vm_template_mapping_csv("vm-to-template-mapping-csv.csv");
plan_obj.save_volume_mapping_csv("volume-tier-mapping-csv.csv");
