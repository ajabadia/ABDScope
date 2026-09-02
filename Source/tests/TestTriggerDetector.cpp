#include <gtest/gtest.h>
#include "../Core/TriggerDetector.h"

using namespace abd::scope;

TEST(TriggerDetectorTest, SineWave440Hz) {
  const float sampleRate = 44100.0f;
  const float freq = 440.0f;
  const size_t numSamples = 2048;

  float* buffer = new float[numSamples];
  for (size_t i = 0; i < numSamples; ++i) {
    buffer[i] = std::sin(2.0f * M_PI * freq * i / sampleRate);
  }

  TriggerResult result = TriggerDetector::process(buffer, numSamples, sampleRate);

  EXPECT_GT(result.triggerIndex, 0);
  EXPECT_NEAR(result.estimatedFrequencyHz, freq, 2.0f);
  EXPECT_STREQ(result.noteName.data(), "A");

  delete[] buffer;
}

TEST(TriggerDetectorTest, SineWave261Hz) {
  const float sampleRate = 44100.0f;
  const float freq = 261.63f;
  const size_t numSamples = 2048;

  float* buffer = new float[numSamples];
  for (size_t i = 0; i < numSamples; ++i) {
    buffer[i] = std::sin(2.0f * M_PI * freq * i / sampleRate);
  }

  TriggerResult result = TriggerDetector::process(buffer, numSamples, sampleRate);

  EXPECT_GT(result.triggerIndex, 0);
  EXPECT_NEAR(result.estimatedFrequencyHz, freq, 2.0f);
  EXPECT_STREQ(result.noteName.data(), "C");

  delete[] buffer;
}

TEST(TriggerDetectorTest, SilenceReturnsZero) {
  float buffer[1024] = { 0.0f };
  TriggerResult result = TriggerDetector::process(buffer, 1024, 44100.0f);

  EXPECT_EQ(result.triggerIndex, 0);
  EXPECT_EQ(result.estimatedFrequencyHz, 0.0f);
  EXPECT_TRUE(result.noteName.empty());
}

TEST(TriggerDetectorTest, DCOffsetReturnsZero) {
  float buffer[1024];
  std::fill_n(buffer, 1024, 0.5f);
  TriggerResult result = TriggerDetector::process(buffer, 1024, 44100.0f);

  EXPECT_EQ(result.triggerIndex, 0);
  EXPECT_EQ(result.estimatedFrequencyHz, 0.0f);
}

TEST(TriggerDetectorTest, NullBufferReturnsZero) {
  TriggerResult result = TriggerDetector::process(nullptr, 1024, 44100.0f);
  EXPECT_EQ(result.triggerIndex, 0);
  EXPECT_EQ(result.estimatedFrequencyHz, 0.0f);
}

TEST(TriggerDetectorTest, SmallBufferReturnsZero) {
  float buffer[8] = { 0 };
  TriggerResult result = TriggerDetector::process(buffer, 8, 44100.0f);
  EXPECT_EQ(result.triggerIndex, 0);
  EXPECT_EQ(result.estimatedFrequencyHz, 0.0f);
}

TEST(TriggerDetectorTest, FrequencyToNoteName) {
  EXPECT_STREQ(TriggerDetector::frequencyToNoteName(440.0f).data(), "A");
  EXPECT_STREQ(TriggerDetector::frequencyToNoteName(261.63f).data(), "C");
  EXPECT_STREQ(TriggerDetector::frequencyToNoteName(82.41f).data(), "E");
  EXPECT_STREQ(TriggerDetector::frequencyToNoteName(110.0f).data(), "A");
  EXPECT_STREQ(TriggerDetector::frequencyToNoteName(880.0f).data(), "A");
}

TEST(TriggerDetectorTest, FrequencyToNoteNameOutOfRange) {
  EXPECT_TRUE(TriggerDetector::frequencyToNoteName(0.0f).empty());
  EXPECT_TRUE(TriggerDetector::frequencyToNoteName(-100.0f).empty());
  EXPECT_TRUE(TriggerDetector::frequencyToNoteName(50000.0f).empty());
}