#pragma once

#include <string>
#include <atomic>
#include <cstdint>
#include <functional>
#include <mutex>

namespace swiftshare
{
    using PathResolverCallback = std::function<std::string(const std::string &filename)>;

    class TransferEngine
    {
    public:
        TransferEngine();
        ~TransferEngine();

        // Receiver
        bool startReceiver(uint16_t port);
        void setPathResolver(PathResolverCallback resolver);
        // Sender (implemented later)
        bool startSender(const std::string &filePath,
                         const std::string &ip,
                         uint16_t port);

        double getProgress() const;
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
        PathResolverCallback pathResolver_;
        mutable std::mutex fileInfoMutex_;
        std::string currentFileName_;
        uint64_t currentFileSize_;
    };

} // namespace swiftshare
