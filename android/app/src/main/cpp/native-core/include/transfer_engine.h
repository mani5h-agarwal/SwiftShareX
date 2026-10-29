#pragma once

#include <string>
#include <atomic>
#include <cstdint>
#include <functional>
#include <mutex>

namespace swiftshare
{
    using PathResolverCallback = std::function<std::string(const std::string &filename)>;

    // Outcome of the most recent transfer, polled by JS alongside progress
    enum class TransferState : int
    {
        Idle = 0,
        Active = 1,
        Completed = 2,
        Failed = 3,
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

        double getProgress() const;
        TransferState getState() const;
        void cancel();
        std::string getCurrentFileName() const;
        uint64_t getCurrentFileSize() const;

    private:
        void receiverThread(uint16_t port);
        void senderThread(const std::string &filePath,
                          const std::string &ip,
                          uint16_t port);

        std::atomic<uint64_t> bytesTransferred_;
        std::atomic<uint64_t> totalBytes_;
        std::atomic<bool> cancelled_;
        std::atomic<bool> receiving_;
        std::atomic<TransferState> state_;
        PathResolverCallback pathResolver_;
        mutable std::mutex peerMutex_;
        std::string allowedPeerIp_;
        mutable std::mutex fileInfoMutex_;
        std::string currentFileName_;
        uint64_t currentFileSize_;
    };

} // namespace swiftshare
