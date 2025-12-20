#include <jsi/jsi.h>
#include <jni.h>
#include "native-core/include/transfer_engine.h"

using namespace facebook;
using namespace swiftshare;

static std::unique_ptr<TransferEngine> engine;
static JavaVM *g_jvm = nullptr;
static jobject g_contextRef = nullptr;
static jclass g_resolverClass = nullptr; // Cache the class reference

#include <thread>
#include <android/log.h>
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, "SwiftShare", __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, "SwiftShare", __VA_ARGS__)

void installJSI(jsi::Runtime &runtime, JNIEnv *env, jobject moduleInstance)
{
    // Get ReactApplicationContext from the module
    jclass moduleClass = env->GetObjectClass(moduleInstance);
    jmethodID getReactContextMethod = env->GetMethodID(
        moduleClass,
        "getReactApplicationContext",
        "()Lcom/facebook/react/bridge/ReactApplicationContext;");

    jobject reactContext = env->CallObjectMethod(moduleInstance, getReactContextMethod);
    if (!reactContext)
    {
        LOGE("Failed to get ReactApplicationContext");
        return;
    }

    // Store global reference to context
    if (g_contextRef)
    {
        env->DeleteGlobalRef(g_contextRef);
    }
    g_contextRef = env->NewGlobalRef(reactContext);
    env->GetJavaVM(&g_jvm);

    // Find and cache the FilePathResolver class with global reference
    jclass localResolverClass = env->FindClass("com/swiftsharex/FilePathResolver");
    if (!localResolverClass)
    {
        LOGE("Failed to find FilePathResolver class");
        env->ExceptionDescribe();
        env->ExceptionClear();
        return;
    }

    if (g_resolverClass)
    {
        env->DeleteGlobalRef(g_resolverClass);
    }
    g_resolverClass = (jclass)env->NewGlobalRef(localResolverClass);
    env->DeleteLocalRef(localResolverClass);

    LOGI("FilePathResolver class loaded successfully");

    // Set up path resolver callback
    if (!engine)
    {
        engine = std::make_unique<TransferEngine>();
    }

    engine->setPathResolver([](const std::string &filename) -> std::string
                            {
        JNIEnv* env = nullptr;
        bool attached = false;
        
        // Attach to current thread if needed
        jint result = g_jvm->GetEnv((void**)&env, JNI_VERSION_1_6);
        if (result == JNI_EDETACHED) {
            if (g_jvm->AttachCurrentThread(&env, nullptr) != 0) {
                LOGE("Failed to attach thread");
                return "";
            }
            attached = true;
        } else if (result != JNI_OK) {
            LOGE("Failed to get JNI environment");
            return "";
        }
        
        std::string resultPath;
        
        if (env && g_contextRef && g_resolverClass) {
            // Get the static method
            jmethodID method = env->GetStaticMethodID(
                g_resolverClass,
                "getReceiveFilePath",
                "(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;"
            );
            
            if (!method) {
                LOGE("getReceiveFilePath method not found");
                env->ExceptionDescribe();
                env->ExceptionClear();
                if (attached) g_jvm->DetachCurrentThread();
                return "";
            }
            
            // Call the method
            jstring jFilename = env->NewStringUTF(filename.c_str());
            jstring jPath = (jstring)env->CallStaticObjectMethod(
                g_resolverClass,
                method,
                g_contextRef,
                jFilename
            );
            
            // Check for exceptions
            if (env->ExceptionCheck()) {
                LOGE("Exception calling getReceiveFilePath");
                env->ExceptionDescribe();
                env->ExceptionClear();
                env->DeleteLocalRef(jFilename);
                if (attached) g_jvm->DetachCurrentThread();
                return "";
            }
            
            if (jPath) {
                const char* path = env->GetStringUTFChars(jPath, nullptr);
                if (path) {
                    resultPath = std::string(path);
                    env->ReleaseStringUTFChars(jPath, path);
                }
                env->DeleteLocalRef(jPath);
            } else {
                LOGE("getReceiveFilePath returned null");
            }
            
            env->DeleteLocalRef(jFilename);
        } else {
            LOGE("Missing references: env=%p, context=%p, class=%p", 
                 env, g_contextRef, g_resolverClass);
        }
        
        if (attached) {
            g_jvm->DetachCurrentThread();
        }
        
        LOGI("Resolved path: %s", resultPath.empty() ? "(empty)" : resultPath.c_str());
        return resultPath; });

    // JSI bindings
    runtime.global().setProperty(
        runtime,
        "startReceiver",
        jsi::Function::createFromHostFunction(
            runtime,
            jsi::PropNameID::forAscii(runtime, "startReceiver"),
            1,
            [](jsi::Runtime &rt,
               const jsi::Value &,
               const jsi::Value *args,
               size_t count) -> jsi::Value
            {
                if (count < 1 || !args[0].isNumber())
                {
                    LOGE("startReceiver: invalid arguments");
                    return jsi::Value(false);
                }

                if (!engine)
                {
                    engine = std::make_unique<TransferEngine>();
                }

                uint16_t port = static_cast<uint16_t>(args[0].asNumber());
                LOGI("Starting receiver on port %d", port);
                bool ok = engine->startReceiver(port);

                return jsi::Value(ok);
            }));

    runtime.global().setProperty(
        runtime,
        "startSender",
        jsi::Function::createFromHostFunction(
            runtime,
            jsi::PropNameID::forAscii(runtime, "startSender"),
            3,
            [](jsi::Runtime &rt,
               const jsi::Value &,
               const jsi::Value *args,
               size_t count) -> jsi::Value
            {
                if (count < 3 ||
                    !args[0].isString() ||
                    !args[1].isString() ||
                    !args[2].isNumber())
                {
                    LOGE("startSender: invalid arguments");
                    return jsi::Value(false);
                }

                if (!engine)
                {
                    engine = std::make_unique<TransferEngine>();
                }

                std::string path = args[0].asString(rt).utf8(rt);
                std::string ip = args[1].asString(rt).utf8(rt);
                uint16_t port = static_cast<uint16_t>(args[2].asNumber());

                LOGI("Starting sender: %s -> %s:%d", path.c_str(), ip.c_str(), port);
                bool ok = engine->startSender(path, ip, port);
                return jsi::Value(ok);
            }));

    runtime.global().setProperty(
        runtime,
        "getProgress",
        jsi::Function::createFromHostFunction(
            runtime,
            jsi::PropNameID::forAscii(runtime, "getProgress"),
            0,
            [](jsi::Runtime &,
               const jsi::Value &,
               const jsi::Value *,
               size_t) -> jsi::Value
            {
                if (!engine)
                {
                    return jsi::Value(0.0);
                }

                return jsi::Value(engine->getProgress());
            }));

    runtime.global().setProperty(
        runtime,
        "cancelTransfer",
        jsi::Function::createFromHostFunction(
            runtime,
            jsi::PropNameID::forAscii(runtime, "cancelTransfer"),
            0,
            [](jsi::Runtime &,
               const jsi::Value &,
               const jsi::Value *,
               size_t) -> jsi::Value
            {
                if (engine)
                {
                    LOGI("Cancelling transfer");
                    engine->cancel();
                }

                return jsi::Value::undefined();
            }));

    runtime.global().setProperty(
        runtime,
        "getCurrentFileName",
        jsi::Function::createFromHostFunction(
            runtime,
            jsi::PropNameID::forAscii(runtime, "getCurrentFileName"),
            0,
            [](jsi::Runtime &rt,
               const jsi::Value &,
               const jsi::Value *,
               size_t) -> jsi::Value
            {
                if (!engine)
                {
                    return jsi::Value(jsi::String::createFromUtf8(rt, ""));
                }

                std::string fileName = engine->getCurrentFileName();
                return jsi::Value(jsi::String::createFromUtf8(rt, fileName));
            }));

    runtime.global().setProperty(
        runtime,
        "getCurrentFileSize",
        jsi::Function::createFromHostFunction(
            runtime,
            jsi::PropNameID::forAscii(runtime, "getCurrentFileSize"),
            0,
            [](jsi::Runtime &,
               const jsi::Value &,
               const jsi::Value *,
               size_t) -> jsi::Value
            {
                if (!engine)
                {
                    return jsi::Value(0);
                }

                uint64_t fileSize = engine->getCurrentFileSize();
                return jsi::Value(static_cast<double>(fileSize));
            }));

    LOGI("JSI installation complete");
}
