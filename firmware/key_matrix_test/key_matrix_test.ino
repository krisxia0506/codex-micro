// XIAO nRF52840 Sense / Sense Plus shared edge pins.
// Serial diagnostic only: never sends HID events or captures audio.
#include <Adafruit_TinyUSB.h>

const uint8_t rowPins[] = {D6, D7, D8, D9};
const uint8_t colPins[] = {D0, D1, D2, D3};
const uint8_t keyIds[4][4] = {
  {0, 1, 2, 0},
  {3, 4, 5, 6},
  {7, 8, 9, 10},
  {0, 11, 12, 13}
};
bool candidate[4][4] = {};
bool stable[4][4] = {};
uint32_t changedAt[4][4] = {};
const uint32_t debounceMs = 10;

void setup() {
  for (uint8_t pin : rowPins) pinMode(pin, INPUT);
  for (uint8_t pin : colPins) pinMode(pin, INPUT_PULLUP);
  Serial.begin(115200);
  const uint32_t started = millis();
  while (!Serial && millis() - started < 3000) delay(1);
  if (Serial) Serial.println("key-matrix: serial-only; COL2ROW; debounce=10ms");
}

void loop() {
  for (uint8_t r = 0; r < 4; ++r) {
    // Set the output latch LOW before enabling the row driver.
    // All unselected rows remain high impedance, never driven HIGH.
    digitalWrite(rowPins[r], LOW);
    pinMode(rowPins[r], OUTPUT);
    delayMicroseconds(50);
    bool sampled[4];
    for (uint8_t c = 0; c < 4; ++c) sampled[c] = digitalRead(colPins[c]) == LOW;
    pinMode(rowPins[r], INPUT);

    const uint32_t now = millis();
    for (uint8_t c = 0; c < 4; ++c) {
      if (!keyIds[r][c]) continue;
      if (sampled[c] != candidate[r][c]) {
        candidate[r][c] = sampled[c];
        changedAt[r][c] = now;
      }
      if (candidate[r][c] != stable[r][c] && now - changedAt[r][c] >= debounceMs) {
        stable[r][c] = candidate[r][c];
        if (Serial) {
          Serial.print("SW");
          Serial.print(keyIds[r][c]);
          Serial.println(stable[r][c] ? " DOWN" : " UP");
        }
      }
    }
  }
  static uint32_t lastHeartbeat = 0;
  const uint32_t now = millis();
  if (now - lastHeartbeat >= 5000) {
    lastHeartbeat = now;
    if (Serial) Serial.println("alive");
  }
  delay(1);
}
