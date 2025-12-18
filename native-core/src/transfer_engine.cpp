#include "transfer_engine.h"

using namespace std;

namespace swiftshare{

    TransferEngine::TransferEngine() : progress(0.0) {}
    TransferEngine::~TransferEngine() {}
    bool TransferEngine::startSend(const string &, const string &, uint16_t){
        progress = 0.0;
        return true;
    }
    bool TransferEngine::startReceive(const string &, uint16_t) {
        progress = 0.0;
        return true;
    }
    double TransferEngine::getProgress() const {
        return progress;
    }
    void TransferEngine::stop() {
        progress = 0.0;
    }

} // namespace swiftshare