# Tags
This is a single tbutil script which will fetch tag data for all entities in a specified group.

It requires only a group parameter. If the group name is a fuzzy match you will be prompted for additional specificity to find the group you want.

```
$ tbutil -s tags.js -g "VMs_azure-eastu*"
Searching for group - ^VMs_azure-eastu
More than one group matches the provided name, please be more specific. Matched groups are;
VMs_azure-eastus-Managed Standard
VMs_azure-eastus-Unmanaged Standard
VMs_azure-eastus-Managed Premium
VMs_azure-eastus2
VMs_azure-eastus-Managed Standard SSD
VMs_azure-eastus2-Unmanaged Standard
VMs_azure-eastus
```

The output is a single Excel file named "tags.xlsx" with the following columns.

* uuid - The UUID of the entity
* displayName - The displayName of the entity
* template - The VM template (if any) of the entity
* targetName - The name of the Turbonomic target which discovered the entity
* tag_key - The "key" of a tag. I.E. For a tag like "Owner=Sales" the tag_key would be "Owner"
* tag_value - The "value" of a tag. I.E. for a tag like "Owner=Sales" the tag_value would be "Sales"

For each value of each tag key there will be a record in the Excel sheet. For example, if an entity had the tags "Owner=Sales" and "Environment=Dev" there would be a total of two rows for the same entity.

If there is no tag for a given entity, there will be only one row in the table, and both tag_key, and tag_value will be "null".
