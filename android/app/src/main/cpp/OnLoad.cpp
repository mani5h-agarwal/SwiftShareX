#include <DefaultComponentsRegistry.h>
#include <DefaultTurboModuleManagerDelegate.h>
#include <FBReactNativeSpec.h>
#include <autolinking.h>
#include <fbjni/fbjni.h>
#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>

namespace facebook::react
{

    void registerComponents(
        std::shared_ptr<const ComponentDescriptorProviderRegistry> registry)
    {
        // Custom Fabric Components go here
        autolinking_registerProviders(registry);
    }

    std::shared_ptr<TurboModule> cxxModuleProvider(
        const std::string &name,
        const std::shared_ptr<CallInvoker> &jsInvoker)
    {
        // CXX Turbo Modules
        return autolinking_cxxModuleProvider(name, jsInvoker);
    }

    std::shared_ptr<TurboModule> javaModuleProvider(
        const std::string &name,
        const JavaTurboModule::InitParams &params)
    {

        // First try to look up core modules (this includes PlatformConstants!)
        if (auto module = FBReactNativeSpec_ModuleProvider(name, params))
        {
            return module;
        }

        // Fallback to autolinked modules
        if (auto module = autolinking_ModuleProvider(name, params))
        {
            return module;
        }

        return nullptr;
    }

} // namespace facebook::react

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *)
{
    return facebook::jni::initialize(vm, []
                                     {
    facebook::react::DefaultTurboModuleManagerDelegate::cxxModuleProvider =
        &facebook::react::cxxModuleProvider;
    facebook::react::DefaultTurboModuleManagerDelegate::javaModuleProvider =
        &facebook::react::javaModuleProvider;
    facebook::react::DefaultComponentsRegistry::
        registerComponentDescriptorsFromEntryPoint =
            &facebook::react::registerComponents; });
}
