const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const util = require("./util");

/// This code parses the OPC UA Binary types definitions and creates a generated .rs type.
/// Fields are converted to snake case as they are written. Code for serializing the struct is also generated

/// Any handwritten types are stripped from the output

let ignored_types = [
    // Handwritten so not autogenerated
    "ExtensionObject", "DataValue", "LocalizedText", "QualifiedName", "DiagnosticInfo", "Variant",
    "ExpandedNodeId", "NodeId", "ByteStringNodeId", "GuidNodeId", "StringNodeId", "NumericNodeId",
    "FourByteNodeId", "TwoByteNodeId", "XmlElement", "Union", "RequestHeader", "ResponseHeader",
    "Node", "InstanceNode", "TypeNode", "ObjectNode", "ObjectTypeNode", "VariableNode", "VariableTypeNode", "ReferenceTypeNode",
    "MethodNode", "ViewNode", "DataTypeNode", "ReferenceNode",
];

let basic_types_import_map = {
    // "basic_types": ["Boolean", "Int32", "UInt32", "Double", "Float", "Int16", "UInt16", "Byte", "SByte"],
    "string": ["UAString", "XmlElement"],
    "byte_string": ["ByteString"],
    "variant": ["Variant"],
    "guid": ["Guid"],
    "localized_text": ["LocalizedText"],
    "qualified_name": ["QualifiedName"],
    "diagnostic_info": ["DiagnosticInfo"],
    "extension_object": ["ExtensionObject"],
    "data_types": ["Duration", "UtcTime"],
    "request_header": ["RequestHeader"],
    "response_header": ["ResponseHeader"],
    "service_types::enums": [
        "MessageSecurityMode", "MonitoringMode", "TimestampsToReturn", "FilterOperator",
        "BrowseDirection", "NodeClass", "SecurityTokenRequestType", "ApplicationType", "UserTokenType",
        "DataChangeTrigger", "HistoryUpdateType", "PerformUpdateType", "ServerState", "AxisScaleEnumeration",
        "BrokerTransportQualityOfService", "JsonDataSetMessageContentMask", "JsonNetworkMessageContentMask",
        "DataSetFieldContentMask", "DataSetFieldFlags", "UadpDataSetMessageContentMask", "UadpNetworkMessageContentMask",
        "OverrideValueHandling", "DataSetOrderingType", "PermissionType", "StructureType", "IdentityCriteriaType",
    ],
    "node_id": ["NodeId", "ExpandedNodeId"],
    "data_value": ["DataValue"],
    "date_time": ["DateTime"],
    "status_codes": ["StatusCode"]
};

// Contains a flattened reverse lookup of the import map
let basic_types_reverse_import_map = {};
_.each(basic_types_import_map, (types, module) => {
    _.each(types, type => {
        basic_types_reverse_import_map[type] = module;
    })
});

// Types that will be marked as serializable
let serde_supported_types = ["ReadValueId", "DataChangeFilter", "EventFilter", "SimpleAttributeOperand", "ContentFilter",
    "ContentFilterElement", "MonitoredItemNotification", "ServerDiagnosticsSummaryDataType", "EventFieldList",
    "DataChangeTrigger", "FilterOperator", "TimestampsToReturn", "MonitoringMode",
    "ConfigurationVersionDataType", "DataSetMetaDataType", "StructureDescription",
    "EnumDescription", "SimpleTypeDescription", "StructureDefinition", "EnumDefinition",
    "FieldMetaData", "KeyValuePair", "DataSetFieldFlags"
];

// The map from OPC UA types to their corresponding Rust types.
let type_name_mappings = {
    "String": "UAString",
    "Boolean": "bool",
    "SByte": "i8",
    "Byte": "u8",
    "Int16": "i16",
    "UInt16": "u16",
    "Int32": "i32",
    "UInt32": "u32",
    "Int64": "i64",
    "UInt64": "u64",
    "Float": "f32",
    "Double": "f64"
};

function massageTypeName(name) {
    if (_.has(type_name_mappings, name)) {
        return type_name_mappings[name];
    } else {
        return name;
    }
}

function convertFieldName(name) {
    // Convert field name to snake case
    return _.snakeCase(name);
}

function errorResponseForEnum(name) {
    switch (name) {
        case "BrowseDirection":
        case "TimestampsToReturn":
            return "Ok(Self::Invalid)";
        default:
            return "Err(StatusCode::BadUnexpectedError)";
    }
}
exports.from_xml = (bsd_file, rs_module) => {
    // Parse the types file, do something upon callback
    let parser = new xml2js.Parser();
    fs.readFile(bsd_file, (err, data) => {
        parser.parseString(data, (err, result) => {
            let data = {
                structured_types: [],
                enums: []
            };

            let structured_types = result["opc:TypeDictionary"]["opc:StructuredType"];
            _.each(structured_types, element => {

                let name = element["$"]["Name"];
                // if name in ignored_types, do nothing
                if (!_.includes(ignored_types, name)) {
                    let fields_to_add = [];
                    let fields_to_hide = [];
                    _.each(element["opc:Field"], field => {
                        // Convert field name to snake case
                        let field_name = convertFieldName(field["$"]["Name"]);

                        // Strip namespace off the type
                        let type = massageTypeName(field["$"]["TypeName"].split(":")[1]);

                        // Look for arrays
                        if (_.has(field["$"], "LengthField")) {
                            fields_to_add.push({
                                name: field_name,
                                type: `Option<Vec<${type}>>`,
                                contained_type: type,
                                inner_type: type,
                                is_array: true
                            });
                            fields_to_hide.push(convertFieldName(field["$"]["LengthField"]));
                        } else {
                            fields_to_add.push({
                                name: field_name,
                                type: type,
                                contained_type: type
                            })
                        }
                    });

                    let structured_type = {
                        name: name,
                        fields_to_add: fields_to_add,
                        fields_to_hide: fields_to_hide
                    };
                    if (_.has(element, "opc:Documentation")) {
                        structured_type.documentation = element["opc:Documentation"];
                    }
                    if (_.has(element["$"], "BaseType")) {
                        structured_type.base_type = element["$"]["BaseType"];
                    }
                    data.structured_types.push(structured_type)
                }

            });

            // Process enums
            let enums = result["opc:TypeDictionary"]["opc:EnumeratedType"];
            _.each(enums, element => {
                let enum_type = {
                    name: element["$"]["Name"],
                    option: element["$"]["IsOptionSet"] || false
                };
                console.log(`${enum_type.name} --- ${enum_type.option}`)
                // Choose type for enum based on length
                let len = element["$"]["LengthInBits"];
                switch (parseInt(len)) {
                    case 6:
                    case 8:
                        enum_type.type = "u8";
                        enum_type.size = "1";
                        break;
                    case 16:
                        enum_type.type = "i16";
                        enum_type.size = "2";
                        break;
                    case 32:
                        enum_type.type = "i32";
                        enum_type.size = "4";
                        break;
                    case 64:
                        enum_type.type = "i64";
                        enum_type.size = "8"
                        break;
                    default:
                        console.log(`Unkown enum LengthInBits: ${len} - ${parseInt(len)} for ${enum_type.name}`);
                        enum_type.type = "i32";
                        enum_type.size = "4";
                        break;
                }

                // The error code is what to return if the value does not match the value expected by
                enum_type.error_code = errorResponseForEnum(enum_type.name);

                if (_.has(element, "opc:Documentation")) {
                    enum_type.documentation = element["opc:Documentation"];
                }
                let values = [];
                _.each(element["opc:EnumeratedValue"], enum_value => {
                    values.push({
                        name: enum_value["$"]["Name"],
                        value: enum_value["$"]["Value"]
                    })
                });
                enum_type.values = values;
                data.enums.push(enum_type);
            });

            generate_types(path.basename(bsd_file), data, rs_module);
        });
    });
}

function generate_types(bsd_file, data, rs_types_dir) {
    // Output module
    generate_types_mod(bsd_file, data.structured_types, rs_types_dir);

    // Output structured types
    _.each(data.structured_types, structured_type => {
        generate_structured_type_file(bsd_file, data.structured_types, structured_type, rs_types_dir);
    });

    // Output enums
    generate_enum_types(bsd_file, data.enums, rs_types_dir);
}

function generate_types_mod(bsd_file, structured_types, rs_types_dir) {
    let file_name = "mod.rs";
    let file_path = `${rs_types_dir}/${file_name}`;

    let contents = `// OPCUA for Rust
// SPDX-License-Identifier: MPL-2.0
// Copyright (C) 2017-2022 Adam Lock
//
// This file was autogenerated from ${bsd_file} by tools/schema/gen_types.js
//
// DO NOT EDIT THIS FILE
// The mods below are handwritten
#![allow(unused_attributes)]
mod enums;
mod impls;
pub use self::enums::*;
pub use self::impls::*;
// All of the remaining are generated by script
`;
    _.each(structured_types, structured_type => {
        let mod_name = _.snakeCase(structured_type.name);
        contents += `mod ${mod_name};
`
    });

    contents += "\n";

    _.each(structured_types, structured_type => {
        let mod_name = _.snakeCase(structured_type.name);
        contents += `pub use self::${mod_name}::*;
`
    });

    util.write_to_file(file_path, contents);
}

function generate_bitfield(enum_type) {
    contents = `
bitflags! {
    pub struct ${enum_type.name}: ${enum_type.type} {`;
            _.each(enum_type.values, (value) => {
                contents += `
        const ${value.name} = ${value.value};`;
            });
        contents += `
    }
}

impl BinaryEncoder<${enum_type.name}> for ${enum_type.name} {
    fn byte_len(&self) -> usize {
        ${enum_type.size}
    }

    fn encode<S: Write>(&self, stream: &mut S) -> EncodingResult<usize> {
        write_${enum_type.type}(stream, self.bits)
    }

    fn decode<S: Read>(stream: &mut S, decoding_options: &DecodingOptions) -> EncodingResult<Self> {
        Ok(${enum_type.name}::from_bits_truncate(${enum_type.type}::decode(stream, decoding_options)?))
    }
}
`

    return contents;
}

function generate_enum_types(bsd_file, enums, rs_types_dir) {
    let contents = `// OPCUA for Rust
// SPDX-License-Identifier: MPL-2.0
// Copyright (C) 2017-2022 Adam Lock
//
// This file was autogenerated from ${bsd_file} by tools/schema/gen_types.js
//
// DO NOT EDIT THIS FILE
#![allow(unused_attributes)]
#![allow(non_upper_case_globals)]
use std::io::{Read, Write};
use crate::types::{
    encoding::*,
    status_codes::StatusCode,
};
use bitflags;
`;

    _.each(enums, (enum_type) => {
        contents += "\n";
        if ("documentation" in enum_type) {
            contents += `/// ${enum_type.documentation}`;
        }

        if (enum_type.option){
            contents += generate_bitfield(enum_type);
        } else {
            let derivations = "Debug, Copy, Clone, PartialEq"
            if (_.includes(serde_supported_types, enum_type.name)) {
                derivations += ", Serialize";
            }
            contents += `
#[derive(${derivations})]
pub enum ${enum_type.name} {`;

        _.each(enum_type.values, (value) => {
            contents += `
    ${value.name} = ${value.value},`;
        });
        contents += `
}

impl BinaryEncoder<${enum_type.name}> for ${enum_type.name} {
    fn byte_len(&self) -> usize {
        ${enum_type.size}
    }

    fn encode<S: Write>(&self, stream: &mut S) -> EncodingResult<usize> {
        write_${enum_type.type}(stream, *self as ${enum_type.type})
    }

    fn decode<S: Read>(stream: &mut S, _: &DecodingOptions) -> EncodingResult<Self> {
        let value = read_${enum_type.type}(stream)?;
        match value {`;

        _.each(enum_type.values, (value) => {
            contents += `
            ${value.value} => Ok(Self::${value.name}),`;
        });

        contents += `
            v => {
                error!("Invalid value {} for enum ${enum_type.name}", v);
                ${enum_type.error_code}
            }
        }
    }
}`
        }
    });

    contents += `
`;

    let file_name = "enums.rs";
    let file_path = `${rs_types_dir}/${file_name}`;
    util.write_to_file(file_path, contents);
}

function generate_type_imports(structured_types, fields_to_add, fields_to_hide, has_message_info) {
    let imports = `#[allow(unused_imports)]
use crate::types::{
    encoding::*,
    basic_types::*,
`;

    if (has_message_info) {
        imports += `    service_types::impls::MessageInfo,
    node_ids::ObjectId,
`;
    }

    // Basic types are any which are hand written
    let basic_types_to_import = {};

    // Service types are other generated types
    let service_types_used = {};

    // Make a set of the types that need to be imported. Referenced types are either handwritten or
    // other generated files so according to which they are, we build up a couple of tables.
    _.each(fields_to_add, field => {
        if (!_.includes(fields_to_hide, field.name)) {
            let type = _.find(structured_types, {name: field.contained_type});
            if (type) {
                // Machine generated type
                service_types_used[type.name] = type.name;
            } else if (_.has(basic_types_reverse_import_map, field.contained_type)) {
                // Handwritten type - use module lookup to figure where its implemented
                let type = massageTypeName(field.contained_type);
                let module = basic_types_reverse_import_map[field.contained_type];
                if (!_.has(basic_types_to_import, module)) {
                    basic_types_to_import[module] = {};
                }
                basic_types_to_import[module][type] = type;
            }
        }
    });

    // Hand written imports
    let basic_type_imports = "";
    _.each(basic_types_to_import, (types, module) => {
        _.each(types, type => {
            basic_type_imports += `    ${module}::${type},
`
        });
    });
    imports += basic_type_imports;

    // Service type imports
    let service_type_imports = "";
    _.each(service_types_used, (value, key) => {
        service_type_imports += `    service_types::${key},
`;
    });
    imports += service_type_imports;
    imports += `};
`;

    return imports;
}

function generate_structured_type_file(bsd_file, structured_types, structured_type, rs_types_dir) {
    let file_name = _.snakeCase(structured_type.name) + ".rs";
    let file_path = `${rs_types_dir}/${file_name}`;

    let has_message_info = _.has(structured_type, "base_type") && structured_type.base_type === "ua:ExtensionObject";

    console.log("Creating structured type file - " + file_path);

    let contents = `// OPCUA for Rust
// SPDX-License-Identifier: MPL-2.0
// Copyright (C) 2017-2022 Adam Lock
//
// This file was autogenerated from ${bsd_file} by tools/schema/gen_types.js
//
// DO NOT EDIT THIS FILE
#![allow(unused_attributes)]
use std::io::{Read, Write};
`;
    contents += generate_type_imports(structured_types, structured_type.fields_to_add, structured_type.fields_to_hide, has_message_info);
    contents += "\n";

    if (_.has(structured_type, "documentation")) {
        contents += `/// ${structured_type.documentation}\n`;
    }

    let derivations = "Debug, Clone, PartialEq";
    if (_.includes(serde_supported_types, structured_type.name)) {
        derivations += ", Serialize";
    }

    contents += `#[derive(${derivations})]
pub struct ${structured_type.name} {
`;

    _.each(structured_type.fields_to_add, field => {
        if (!_.includes(structured_type.fields_to_hide, field.name)) {
            contents += `    pub ${field.name}: ${field.type},\n`;
        }
    });
    contents += `}
`;

    if (has_message_info) {
        contents += `
impl MessageInfo for ${structured_type.name} {
    fn object_id(&self) -> ObjectId {
        ObjectId::${structured_type.name}_Encoding_DefaultBinary
    }
}
`;
    }

    contents += `
impl BinaryEncoder<${structured_type.name}> for ${structured_type.name} {
    fn byte_len(&self) -> usize {
`;
    if (structured_type.fields_to_add.length > 0) {
        contents += `        let mut size = 0;\n`;

        _.each(structured_type.fields_to_add, field => {
            if (!_.includes(structured_type.fields_to_hide, field.name)) {
                if (_.has(field, 'is_array')) {
                    contents += `        size += byte_len_array(&self.${field.name});\n`;
                } else {
                    contents += `        size += self.${field.name}.byte_len();\n`;
                }
            }
        });

        contents += `        size\n`;
    } else {
        contents += `        0\n`;
    }

    contents += `    }

    #[allow(unused_variables)]
    fn encode<S: Write>(&self, stream: &mut S) -> EncodingResult<usize> {
`;

    if (structured_type.fields_to_add.length > 0) {
        contents += `        let mut size = 0;\n`;

        _.each(structured_type.fields_to_add, field => {
            if (!_.includes(structured_type.fields_to_hide, field.name)) {
                if (_.has(field, 'is_array')) {
                    contents += `        size += write_array(stream, &self.${field.name})?;\n`;
                } else {
                    contents += `        size += self.${field.name}.encode(stream)?;\n`;
                }
            }
        });

        contents += `        Ok(size)\n`;
    } else {
        contents += `        Ok(0)\n`;
    }

    contents += `    }

    #[allow(unused_variables)]
    fn decode<S: Read>(stream: &mut S, decoding_options: &DecodingOptions) -> EncodingResult<Self> {
`;

    _.each(structured_type.fields_to_add, field => {
        if (!_.includes(structured_type.fields_to_hide, field.name)) {
            if (_.has(field, 'is_array')) {
                contents += `        let ${field.name}: ${field.type} = read_array(stream, decoding_options)?;\n`;
            } else {
                contents += `        let ${field.name} = ${field.type}::decode(stream, decoding_options)?;\n`;
            }
        }
    });

    contents += `        Ok(${structured_type.name} {
`;

    _.each(structured_type.fields_to_add, field => {
        if (!_.includes(structured_type.fields_to_hide, field.name)) {
            contents += `            ${field.name},\n`;
        }
    });

    contents += `        })
    }
}
`;

    util.write_to_file(file_path, contents);
}