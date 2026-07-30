Pod::Spec.new do |s|
  s.name           = 'ICloud'
  s.version        = '1.0.0'
  s.summary        = 'iCloud Documents container path for FitTrack'
  s.description    = 'Exposes the ubiquity container Documents URL to JS.'
  s.author         = 'Klipbit'
  s.homepage       = 'https://klipbit.com'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,swift}'
end
