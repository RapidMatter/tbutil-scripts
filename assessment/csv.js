/*global args,CloudMigrationPlan*/
/*jslint plusplus: true*/

var plan_uuid = "",
    i = 0;
for (i = 0; i < args.length; i++) {
    if (args[i] === "-i") {
        plan_uuid = args[i + 1];
    }
}

var plan_obj = new CloudMigrationPlan({}, {}, "foo", {});
plan_obj.scenario_run_response.uuid = plan_uuid;
plan_obj.wait();

printJson(plan_obj.scenario_run_response);

return 0;
plan_obj.save_vm_template_mapping_csv("vm-to-template-mapping-csv.csv");
plan_obj.save_volume_mapping_csv("volume-tier-mapping-csv.csv");
