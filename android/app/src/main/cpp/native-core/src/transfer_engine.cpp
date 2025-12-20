#include "transfer_engine.h"
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/stat.h>
#include <cstring>
#include <vector>
#include <thread>
#include <chrono>
#include <errno.h>
#include "protocol.h"

#define LOG_TAG "SwiftShare"
#include <android/log.h>
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

using namespace swiftshare;

TransferEngine::TransferEngine()
    : bytesTransferred_(0),
      totalBytes_(0),
      cancelled_(false),
      receiving_(false),
      pathResolver_(nullptr),
      currentFileName_(""),
      currentFileSize_(0) {}

TransferEngine::~TransferEngine()
{
    cancel();
}

void TransferEngine::setPathResolver(PathResolverCallback resolver)
{
    pathResolver_ = resolver;
}

void TransferEngine::cancel()
{
    cancelled_ = true;
}

bool TransferEngine::startReceiver(uint16_t port)
{
    // Prevent multiple receiver threads
    bool wasRunning = receiving_.exchange(true);
    cancelled_ = false;
    if (wasRunning)
    {
        return true; // already running
    }

    bytesTransferred_ = 0;
    totalBytes_ = 0;

    std::thread(&TransferEngine::receiverThread, this, port).detach();
    return true;
}

void TransferEngine::receiverThread(uint16_t port)
{
    int server = socket(AF_INET, SOCK_STREAM, 0);
    if (server < 0)
    {
        LOGE("socket failed");
        receiving_ = false;
        return;
    }

    int yes = 1;
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof(yes));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    addr.sin_addr.s_addr = INADDR_ANY;

    if (bind(server, (sockaddr *)&addr, sizeof(addr)) < 0)
    {
        LOGE("bind failed");
        close(server);
        receiving_ = false;
        return;
    }

    if (listen(server, 4) < 0)
    {
        LOGE("listen failed");
        close(server);
        receiving_ = false;
        return;
    }

    // Make server socket non-blocking to allow cancel
    int flags = fcntl(server, F_GETFL, 0);
    fcntl(server, F_SETFL, flags | O_NONBLOCK);

    while (!cancelled_)
    {
        int client = accept(server, nullptr, nullptr);
        if (client < 0)
        {
            // EAGAIN/EWOULDBLOCK -> no pending connections
            if (errno == EAGAIN || errno == EWOULDBLOCK)
            {
                std::this_thread::sleep_for(std::chrono::milliseconds(50));
                continue;
            }
            LOGE("accept failed");
            break;
        }

        // Handle a single file transfer per connection
        HelloPacket hello{};
        if (recv(client, &hello, sizeof(hello), MSG_WAITALL) != sizeof(hello))
        {
            LOGE("hello read failed");
            close(client);
            continue;
        }

        FileMeta meta{};
        if (recv(client, &meta, sizeof(meta), MSG_WAITALL) != sizeof(meta))
        {
            LOGE("meta read failed");
            close(client);
            continue;
        }

        std::string filename(meta.nameLen, '\0');
        if (recv(client, filename.data(), meta.nameLen, MSG_WAITALL) != meta.nameLen)
        {
            LOGE("filename read failed");
            close(client);
            continue;
        }

        std::string outPath;
        if (pathResolver_)
        {
            outPath = pathResolver_(filename);
        }
        else
        {
            LOGE("No path resolver set!");
            close(client);
            continue;
        }

        if (outPath.empty())
        {
            LOGE("Failed to resolve output path");
            close(client);
            continue;
        }

        LOGI("Saving to: %s", outPath.c_str());

        // Store current file info
        {
            std::lock_guard<std::mutex> lock(fileInfoMutex_);
            currentFileName_ = filename;
            currentFileSize_ = meta.fileSize;
        }

        int fd = open(outPath.c_str(), O_CREAT | O_WRONLY, 0644);
        if (fd < 0)
        {
            LOGE("file open failed");
            close(client);
            continue;
        }

        off_t existing = lseek(fd, 0, SEEK_END);
        uint64_t resumeOffset = existing;
        send(client, &resumeOffset, sizeof(resumeOffset), 0);

        bytesTransferred_ = resumeOffset;
        totalBytes_ = meta.fileSize;

        while (!cancelled_ && bytesTransferred_ < totalBytes_)
        {
            uint8_t marker;
            if (recv(client, &marker, 1, MSG_WAITALL) != 1)
                break;

            if (marker == END_OF_TRANSFER)
                break;

            DataChunkHeader hdr{};
            ((uint8_t *)&hdr)[0] = marker;

            if (recv(client, ((uint8_t *)&hdr) + 1, sizeof(hdr) - 1, MSG_WAITALL) != sizeof(hdr) - 1)
                break;

            if (hdr.length == 0 || hdr.length > meta.chunkSize)
                break;

            std::vector<char> buffer(hdr.length);

            if (recv(client, buffer.data(), hdr.length, MSG_WAITALL) != (ssize_t)hdr.length)
                break;

            ssize_t written = 0;
            while (written < (ssize_t)hdr.length)
            {
                ssize_t w = write(fd, buffer.data() + written, hdr.length - written);
                if (w <= 0)
                    break;
                written += w;
            }

            bytesTransferred_ += hdr.length;
        }

        close(fd);
        close(client);

        // Don't reset immediately - let JS detect completion (progress = 1.0)
        // Wait briefly, then reset for next transfer
        std::this_thread::sleep_for(std::chrono::milliseconds(1000));
        bytesTransferred_ = 0;
        totalBytes_ = 0;

        // Clear file info
        {
            std::lock_guard<std::mutex> lock(fileInfoMutex_);
            currentFileName_.clear();
            currentFileSize_ = 0;
        }
    }

    close(server);
    receiving_ = false;
}

double TransferEngine::getProgress() const
{
    if (totalBytes_ == 0)
        return 0.0;
    return (double)bytesTransferred_ / (double)totalBytes_;
}

bool TransferEngine::startSender(const std::string &filePath,
                                 const std::string &ip,
                                 uint16_t port)
{
    cancelled_ = false;
    bytesTransferred_ = 0;
    totalBytes_ = 0;

    std::thread([=]()
                { this->senderThread(filePath, ip, port); })
        .detach();

    return true;
}

void TransferEngine::senderThread(const std::string &filePath,
                                  const std::string &ip,
                                  uint16_t port)
{
    using namespace swiftshare;

    // 1️⃣ Open file
    int fd = open(filePath.c_str(), O_RDONLY);
    if (fd < 0)
    {
        LOGE("Failed to open file: %s", filePath.c_str());
        return;
    }

    struct stat st{};
    fstat(fd, &st);
    uint64_t fileSize = st.st_size;
    totalBytes_ = fileSize;

    // Extract filename
    std::string filename =
        filePath.substr(filePath.find_last_of('/') + 1);

    // 2️⃣ Create socket
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0)
    {
        LOGE("socket() failed");
        close(fd);
        return;
    }

    // Optional speed tuning (safe)
    int bufSize = 4 * 1024 * 1024;
    setsockopt(sock, SOL_SOCKET, SO_SNDBUF, &bufSize, sizeof(bufSize));
    setsockopt(sock, SOL_SOCKET, SO_RCVBUF, &bufSize, sizeof(bufSize));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(port);
    addr.sin_addr.s_addr = inet_addr(ip.c_str());
    if (inet_pton(AF_INET, ip.c_str(), &addr.sin_addr) != 1)
    {
        LOGE("Invalid IP address");
        close(sock);
        close(fd);
        return;
    }
    // 3️⃣ Connect
    if (connect(sock, (sockaddr *)&addr, sizeof(addr)) < 0)
    {
        LOGE("connect() failed");
        close(sock);
        close(fd);
        return;
    }

    LOGI("Sender connected to receiver");

    // 4️⃣ Send HELLO
    HelloPacket hello{};
    memcpy(hello.magic, MAGIC, 4);
    hello.version = VERSION;
    hello.mode = MODE_SEND;
    hello.reserved = 0;

    send(sock, &hello, sizeof(hello), 0);

    FileMeta meta{};
    meta.fileSize = fileSize;
    meta.nameLen = filename.size();
    meta.chunkSize = 256 * 1024; // 256 KB

    send(sock, &meta, sizeof(meta), 0);
    send(sock, filename.data(), filename.size(), 0);

    uint64_t resumeOffset = 0;
    if (recv(sock, &resumeOffset, sizeof(resumeOffset), MSG_WAITALL) != sizeof(resumeOffset))
    {
        LOGE("Failed to receive resume offset");
        close(sock);
        close(fd);
        return;
    }

    lseek(fd, resumeOffset, SEEK_SET);
    bytesTransferred_ = resumeOffset;

    std::vector<char> buffer(meta.chunkSize);

    while (!cancelled_)
    {
        ssize_t n = read(fd, buffer.data(), buffer.size());
        if (n <= 0)
            break;

        DataChunkHeader hdr{};
        hdr.length = (uint32_t)n;

        send(sock, &hdr, sizeof(hdr), 0);
        ssize_t sent = 0;
        while (sent < n)
        {
            ssize_t s = send(sock, buffer.data() + sent, n - sent, 0);
            if (s <= 0)
            {
                LOGE("send() failed");
                // goto cleanup;
                return;
            }
            sent += s;
        }
        bytesTransferred_ += n;
    }

    // 8️⃣ Signal completion
    uint8_t end = END_OF_TRANSFER;
    send(sock, &end, sizeof(end), 0);

    LOGI("Sender completed transfer");

    close(sock);
    close(fd);

    // Wait briefly to let JS detect completion (progress = 1.0) before resetting
    std::this_thread::sleep_for(std::chrono::milliseconds(1000));
    bytesTransferred_ = 0;
    totalBytes_ = 0;
}

std::string TransferEngine::getCurrentFileName() const
{
    std::lock_guard<std::mutex> lock(fileInfoMutex_);
    return currentFileName_;
}

uint64_t TransferEngine::getCurrentFileSize() const
{
    std::lock_guard<std::mutex> lock(fileInfoMutex_);
    return currentFileSize_;
}