#include <jni.h>
#include <jsi/jsi.h>

using namespace facebook;

extern void installJSI(jsi::Runtime &runtime, JNIEnv *env, jobject moduleInstance);

extern "C" JNIEXPORT void JNICALL
Java_com_swiftshare_SwiftShareJSIModule_nativeInstall(
    JNIEnv *env,
    jobject thiz,
    jlong runtimePtr)
{
    auto *runtime = reinterpret_cast<jsi::Runtime *>(runtimePtr);

    // Pass the module instance so we can get the context
    installJSI(*runtime, env, thiz);
}