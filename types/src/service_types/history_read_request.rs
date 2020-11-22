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
    service_types::impls::MessageInfo,
    node_ids::ObjectId,
    request_header::RequestHeader,
    extension_object::ExtensionObject,
    service_types::enums::TimestampsToReturn,
    service_types::HistoryReadValueId,
};

#[derive(Debug, Clone, PartialEq)]
pub struct HistoryReadRequest {
    pub request_header: RequestHeader,
    pub history_read_details: ExtensionObject,
    pub timestamps_to_return: TimestampsToReturn,
    pub release_continuation_points: bool,
    pub nodes_to_read: Option<Vec<HistoryReadValueId>>,
}

impl MessageInfo for HistoryReadRequest {
    fn object_id(&self) -> ObjectId {
        ObjectId::HistoryReadRequest_Encoding_DefaultBinary
    }
}

impl BinaryEncoder<HistoryReadRequest> for HistoryReadRequest {
    fn byte_len(&self) -> usize {
        let mut size = 0;
        size += self.request_header.byte_len();
        size += self.history_read_details.byte_len();
        size += self.timestamps_to_return.byte_len();
        size += self.release_continuation_points.byte_len();
        size += byte_len_array(&self.nodes_to_read);
        size
    }

    #[allow(unused_variables)]
    fn encode<S: Write>(&self, stream: &mut S) -> EncodingResult<usize> {
        let mut size = 0;
        size += self.request_header.encode(stream)?;
        size += self.history_read_details.encode(stream)?;
        size += self.timestamps_to_return.encode(stream)?;
        size += self.release_continuation_points.encode(stream)?;
        size += write_array(stream, &self.nodes_to_read)?;
        Ok(size)
    }

    #[allow(unused_variables)]
    fn decode<S: Read>(stream: &mut S, decoding_limits: &DecodingLimits) -> EncodingResult<Self> {
        let request_header = RequestHeader::decode(stream, decoding_limits)?;
        let history_read_details = ExtensionObject::decode(stream, decoding_limits)?;
        let timestamps_to_return = TimestampsToReturn::decode(stream, decoding_limits)?;
        let release_continuation_points = bool::decode(stream, decoding_limits)?;
        let nodes_to_read: Option<Vec<HistoryReadValueId>> = read_array(stream, decoding_limits)?;
        Ok(HistoryReadRequest {
            request_header,
            history_read_details,
            timestamps_to_return,
            release_continuation_points,
            nodes_to_read,
        })
    }
}
