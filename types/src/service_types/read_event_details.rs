// OPCUA for Rust
// SPDX-License-Identifier: MPL-2.0
// Copyright (C) 2017-2020 Adam Lock

// This file was autogenerated from Opc.Ua.Types.bsd.xml by tools/schema/gen_types.js
// DO NOT EDIT THIS FILE
#![rustfmt::skip]

use std::io::{Read, Write};

#[allow(unused_imports)]
use crate::{
    encoding::*,
    basic_types::*,
    date_time::DateTime,
    service_types::EventFilter,
};

#[derive(Debug, Clone, PartialEq)]
pub struct ReadEventDetails {
    pub num_values_per_node: u32,
    pub start_time: DateTime,
    pub end_time: DateTime,
    pub filter: EventFilter,
}

impl BinaryEncoder<ReadEventDetails> for ReadEventDetails {
    fn byte_len(&self) -> usize {
        let mut size = 0;
        size += self.num_values_per_node.byte_len();
        size += self.start_time.byte_len();
        size += self.end_time.byte_len();
        size += self.filter.byte_len();
        size
    }

    #[allow(unused_variables)]
    fn encode<S: Write>(&self, stream: &mut S) -> EncodingResult<usize> {
        let mut size = 0;
        size += self.num_values_per_node.encode(stream)?;
        size += self.start_time.encode(stream)?;
        size += self.end_time.encode(stream)?;
        size += self.filter.encode(stream)?;
        Ok(size)
    }

    #[allow(unused_variables)]
    fn decode<S: Read>(stream: &mut S, decoding_limits: &DecodingLimits) -> EncodingResult<Self> {
        let num_values_per_node = u32::decode(stream, decoding_limits)?;
        let start_time = DateTime::decode(stream, decoding_limits)?;
        let end_time = DateTime::decode(stream, decoding_limits)?;
        let filter = EventFilter::decode(stream, decoding_limits)?;
        Ok(ReadEventDetails {
            num_values_per_node,
            start_time,
            end_time,
            filter,
        })
    }
}
