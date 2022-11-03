// OPCUA for Rust
// SPDX-License-Identifier: MPL-2.0
// Copyright (C) 2017-2022 Adam Lock
//
// This file was autogenerated from Opc.Ua.Types.bsd by tools/schema/gen_types.js
//
// DO NOT EDIT THIS FILE
#![allow(unused_attributes)]
use std::io::{Read, Write};
#[allow(unused_imports)]
use crate::types::{
    encoding::*,
    basic_types::*,
    service_types::enums::DataChangeTrigger,
};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DataChangeFilter {
    pub trigger: DataChangeTrigger,
    pub deadband_type: u32,
    pub deadband_value: f64,
}

impl BinaryEncoder<DataChangeFilter> for DataChangeFilter {
    fn byte_len(&self) -> usize {
        let mut size = 0;
        size += self.trigger.byte_len();
        size += self.deadband_type.byte_len();
        size += self.deadband_value.byte_len();
        size
    }

    #[allow(unused_variables)]
    fn encode<S: Write>(&self, stream: &mut S) -> EncodingResult<usize> {
        let mut size = 0;
        size += self.trigger.encode(stream)?;
        size += self.deadband_type.encode(stream)?;
        size += self.deadband_value.encode(stream)?;
        Ok(size)
    }

    #[allow(unused_variables)]
    fn decode<S: Read>(stream: &mut S, decoding_options: &DecodingOptions) -> EncodingResult<Self> {
        let trigger = DataChangeTrigger::decode(stream, decoding_options)?;
        let deadband_type = u32::decode(stream, decoding_options)?;
        let deadband_value = f64::decode(stream, decoding_options)?;
        Ok(DataChangeFilter {
            trigger,
            deadband_type,
            deadband_value,
        })
    }
}
