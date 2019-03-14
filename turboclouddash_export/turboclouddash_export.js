/*globals client,eprintln,require*/

var plan = require("./lib/plans.js");

var compiled = {};

var opts = {
    q: "VMs_vCenter",
    className: "Group"
};

// Find our origin group.
var from_grp_resp = client.getSearchResults(opts);
if (from_grp_resp.length === 0) {
    eprintln("Searching for group VMs_vCenter returned " + from_grp_resp.length + " results, expecting at least 1");
    return;
}
var from_grp = from_grp_resp[0];

// Find our destination group.
opts.q = "PMs_azure-East US";
var to_grp_resp = client.getSearchResults(opts);
if (to_grp_resp.length === 0) {
    eprintln("Searching for group PMs_azure-East US returned " + to_grp_resp.length + " results, expecting at least 1");
    return;
}
var to_grp = to_grp_resp[0];

var plan_obj = new plan.CloudMigrationPlan(from_grp, to_grp, "TurboCloudDash Migration Plan", {});
plan_obj.run();
plan_obj.wait();

var turbo_market_uuid = plan_obj.scenario_run_response.uuid;
var liftAndShift_market_uuid = plan_obj.scenario_run_response.relatedPlanMarkets[0].uuid;

compiled.plans = {};
compiled.plans.turbo = client.getCurrentActionsByMarketUuid(turbo_market_uuid, {});
compiled.plans.liftAndShift = client.getCurrentActionsByMarketUuid(liftAndShift_market_uuid, {});
// Post: {"actionTypeList":["RIGHT_SIZE"],"groupBy":["riskSubCategory"],"relatedEntityTypes":["VirtualMachine"]}
// URL: https://msse02.demo.turbonomic.com/vmturbo/rest/markets/_8H6fcCuhEem2q6U8jeNJoA/actions/stats?disable_hateoas=true
compiled.stats = {};
compiled.stats.utilization = client.getMarketActionStats(turbo_market_uuid, {"actionTypeList": ["RIGHT_SIZE"], "groupBy": ["riskSubCategory"], "relatedEntityTypes": ["VirtualMachine"]});

printJson(compiled);
