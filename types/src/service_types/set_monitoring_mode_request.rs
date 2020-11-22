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
    service_types::enums::MonitoringMode,
};

#[derive(Debug, Clone, PartialEq)]
pub struct SetMonitoringModeRequest {
    pub request_header: RequestHeader,
    pub subscription_id: u32,
    pub monitoring_mode: MonitoringMode,
    pub monitored_item_ids: Option<Vec<u32>>,
}

impl MessageInfo for SetMonitoringModeRequest {
    fn object_id(&self) -> ObjectId {
        ObjectId::SetMonitoringModeRequest_Encoding_DefaultBinary
    }
}

impl BinaryEncoder<SetMonitoringModeRequest> for SetMonitoringModeRequest {
    fn byte_len(&self) -> usize {
        let mut size = 0;
        size += self.request_header.byte_len();
        size += self.subscription_id.byte_len();
        size += self.monitoring_mode.byte_len();
        size += byte_len_array(&self.monitored_item_ids);
        size
    }

    #[allow(unused_variables)]
    fn encode<S: Write>(&self, stream: &mut S) -> EncodingResult<usize> {
        let mut size = 0;
        size += self.request_header.encode(stream)?;
        size += self.subscription_id.encode(stream)?;
        size += self.monitoring_mode.encode(stream)?;
        size += write_array(stream, &self.monitored_item_ids)?;
        Ok(size)
    }

    #[allow(unused_variables)]
    fn decode<S: Read>(stream: &mut S, decoding_limits: &DecodingLimits) -> EncodingResult<Self> {
        let request_header = RequestHeader::decode(stream, decoding_limits)?;
        let subscription_id = u32::decode(stream, decoding_limits)?;
        let monitoring_mode = MonitoringMode::decode(stream, decoding_limits)?;
        let monitored_item_ids: Option<Vec<u32>> = read_array(stream, decoding_limits)?;
        Ok(SetMonitoringModeRequest {
            request_header,
            subscription_id,
            monitoring_mode,
            monitored_item_ids,
        })
    }
}
