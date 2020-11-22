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
    qualified_name::QualifiedName,
    variant::Variant,
};

#[derive(Debug, Clone, PartialEq)]
pub struct KeyValuePair {
    pub key: QualifiedName,
    pub value: Variant,
}

impl MessageInfo for KeyValuePair {
    fn object_id(&self) -> ObjectId {
        ObjectId::KeyValuePair_Encoding_DefaultBinary
    }
}

impl BinaryEncoder<KeyValuePair> for KeyValuePair {
    fn byte_len(&self) -> usize {
        let mut size = 0;
        size += self.key.byte_len();
        size += self.value.byte_len();
        size
    }

    #[allow(unused_variables)]
    fn encode<S: Write>(&self, stream: &mut S) -> EncodingResult<usize> {
        let mut size = 0;
        size += self.key.encode(stream)?;
        size += self.value.encode(stream)?;
        Ok(size)
    }

    #[allow(unused_variables)]
    fn decode<S: Read>(stream: &mut S, decoding_limits: &DecodingLimits) -> EncodingResult<Self> {
        let key = QualifiedName::decode(stream, decoding_limits)?;
        let value = Variant::decode(stream, decoding_limits)?;
        Ok(KeyValuePair {
            key,
            value,
        })
    }
}
