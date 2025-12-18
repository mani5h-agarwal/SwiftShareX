#pragma once

#include <cstdint>

namespace swiftshare {

/*
 * SwiftShare Transfer Protocol (SWFT)
 *
 * Transport  : TCP
 * Endianness : Little-endian
 * Version    : 1
 */

// ===============================
// Protocol Identity
// ===============================

constexpr char MAGIC[4] = {'S', 'W', 'F', 'T'};
constexpr uint8_t VERSION = 1;

// ===============================
// Modes
// ===============================

constexpr uint8_t MODE_SEND = 1;
constexpr uint8_t MODE_RECEIVE = 2;

// ===============================
// Status Codes
// ===============================

constexpr uint8_t STATUS_OK = 0x00;
constexpr uint8_t STATUS_ERROR = 0x01;

// ===============================
// Handshake
// ===============================

struct HelloPacket {
    char magic[4];        // "SWFT"
    uint8_t version;      // protocol version
    uint8_t mode;         // MODE_SEND / MODE_RECEIVE
    uint16_t reserved;    // alignment + future use
};

// ===============================
// File Metadata
// ===============================

struct FileMeta {
    uint64_t fileSize;    // total file size in bytes
    uint16_t nameLen;     // filename length (UTF-8)
    uint32_t chunkSize;   // sender preferred chunk size
    // followed by `nameLen` bytes of filename
};

// ===============================
// Data Framing
// ===============================

struct DataChunkHeader {
    uint32_t length;      // number of bytes that follow
    // followed by `length` bytes of raw file data
};

// ===============================
// Completion Marker
// ===============================

constexpr uint8_t END_OF_TRANSFER = 0xFF;

} // namespace swiftshare