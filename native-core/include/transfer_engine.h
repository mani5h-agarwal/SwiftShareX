#pragma once // what is this for to prevent multiple inclusions of the same header file

#include <string> 
#include <cstdint>

using namespace std;

namespace swiftshare {
    class TransferEngine {
    public:
        TransferEngine(); // Constructor
        ~TransferEngine(); // Destructor
        // Start sending a file
        bool startSend(const string &filePath,
                       const string &ip,
                       uint16_t port);
        // Start receiving a file
        bool startReceive(const string &saveDir,
                          uint16_t port);
        // Get progress (0.0 to 1.0)
        double getProgress() const;
        // Stop transfer
        void stop();
    private:
        double progress;// Transfer progress
    };

} // namespace swiftshare