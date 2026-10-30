#pragma once

#include <string>
#include <atomic>
#include <cstdint>
#include <functional>
#include <mutex>
#include <vector>

namespace swiftshare
{
    using PathResolverCallback = std::function<std::string(const std::string &filename)>;

    // A finished transfer. JS collects these on its progress poll, so a file
    // that finishes between polls is never missed.
    struct TransferEvent
    {
        bool incoming;
        std::string fileName;
        uint64_t fileSize;
        bool success;
        // The sender deliberately stopped this file partway
        bool stoppedBySender = false;
    };

    class TransferEngine
    {
    public:
        TransferEngine();
        ~TransferEngine();

        // Receiver; only accepts connections from peerIp
        bool startReceiver(uint16_t port, const std::string &peerIp);
        void setPathResolver(PathResolverCallback resolver);
        // Sender (implemented later)
        bool startSender(const std::string &filePath,
                         const std::string &ip,
                         uint16_t port);

        // Sender reading from an already open file; takes ownership of fd
        bool startSender(int fd,
                         const std::string &filename,
                         const std::string &ip,
                         uint16_t port);

        double getProgress() const;
        std::vector<TransferEvent> takeEvents();
        void cancel();
        // Stops only the outgoing file; the receiver keeps running
        void cancelSend();
        std::string getCurrentFileName() const;
        uint64_t getCurrentFileSize() const;

    private:
        void receiverThread(uint16_t port);
        void senderThread(int fd,
                          const std::string &filename,
                          const std::string &ip,
                          uint16_t port);

        bool waitForReceiver(int sock, uint64_t fileSize);
        void pushEvent(TransferEvent event);

        std::atomic<uint64_t> bytesTransferred_;
        std::atomic<uint64_t> totalBytes_;
        std::atomic<bool> cancelled_;
        std::atomic<bool> sendCancelled_;
        std::atomic<bool> receiving_;
        PathResolverCallback pathResolver_;
        mutable std::mutex peerMutex_;
        std::string allowedPeerIp_;
        std::mutex eventsMutex_;
        std::vector<TransferEvent> events_;
        mutable std::mutex fileInfoMutex_;
        std::string currentFileName_;
        uint64_t currentFileSize_;
    };

} // namespace swiftshare
