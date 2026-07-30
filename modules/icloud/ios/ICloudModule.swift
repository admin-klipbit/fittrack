import ExpoModulesCore

public class ICloudModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ICloud")

    // Returns the iCloud Drive Documents URL for our ubiquity container, or nil
    // when iCloud is unavailable (not signed in, disabled, simulator without account).
    AsyncFunction("getDocumentsUrl") { () -> String? in
      guard let container = FileManager.default.url(forUbiquityContainerIdentifier: nil) else {
        return nil
      }
      let docs = container.appendingPathComponent("Documents")
      try? FileManager.default.createDirectory(at: docs, withIntermediateDirectories: true)
      return docs.absoluteString
    }
  }
}
