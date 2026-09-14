#include <Arduino.h>

int openInput   = 22;
int closeInput  = 23;
int unlockInput = 27;
int lockInput   = 26;

int led = 32;

bool openLast   = false;
bool closeLast  = false;
bool unlockLast = false;
bool lockLast   = false;

int openActuator  = 12;
int closeActuator = 14;

unsigned long openTimer   = 0;
unsigned long closeTimer  = 0;
unsigned long answerTimer = 0;
unsigned long statusTimer = 0;

bool locked = true;
int count  = 0;
int target = 0;

// Forward declarations
void checkInput();
void checkTimers();
void showStatus();
void openLock();
void closeLock();
void onUnlockPush();
void checkAnswer();
void errorMsg();

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 Lock System Starting...");

  // Use INPUT_PULLDOWN to prevent floating pin reads
  pinMode(openInput, INPUT_PULLDOWN);
  pinMode(closeInput, INPUT_PULLDOWN);
  pinMode(unlockInput, INPUT_PULLDOWN);
  pinMode(lockInput, INPUT_PULLDOWN);

  pinMode(openActuator, OUTPUT);
  pinMode(closeActuator, OUTPUT);
  pinMode(led, OUTPUT);

  // Seed random generator
  randomSeed(analogRead(34));

  digitalWrite(led, HIGH);
  delay(100);
  digitalWrite(led, LOW);
  delay(100);
}

void loop() {
  checkInput();
  checkTimers();
  showStatus();
  delay(10); // Small delay to prevent Watchdog Timer resets
}

void checkInput() {
  if (!locked) {
    bool open = digitalRead(openInput);
    if (openLast != open) {
      openLast = open;
      if (!open) openLock();
    }

    bool close = digitalRead(closeInput);
    if (closeLast != close) {
      closeLast = close;
      if (!close) closeLock();
    }

    bool lock = digitalRead(lockInput);
    if (lockLast != lock) {
      lockLast = lock;
      if (!lock) locked = true;
    }

  } else {
    bool unlock = digitalRead(unlockInput);
    if (unlockLast != unlock) {
      unlockLast = unlock;
      if (!unlock) onUnlockPush();
    }

    bool open = digitalRead(openInput);
    if (openLast != open) {
      openLast = open;
      if (!open) errorMsg();
    }

    bool close = digitalRead(closeInput);
    if (closeLast != close) {
      closeLast = close;
      if (!close) errorMsg();
    }

    bool lock = digitalRead(lockInput);
    if (lockLast != lock) {
      lockLast = lock;
      if (!lock) {
        digitalWrite(led, HIGH);
        delay(500);
        digitalWrite(led, LOW);
        delay(500);
      }
    }
  }
}

void openLock() {
  digitalWrite(openActuator, HIGH);
  openTimer = millis();
}

void closeLock() {
  digitalWrite(closeActuator, HIGH);
  closeTimer = millis();
}

void checkTimers() {
  if (openTimer > 0 && (millis() - openTimer > 500)) {
    digitalWrite(openActuator, LOW);
    openTimer = 0;
  }
  if (closeTimer > 0 && (millis() - closeTimer > 500)) {
    digitalWrite(closeActuator, LOW);
    closeTimer = 0;
  }
  if (target != 0 && (millis() - answerTimer > 1500)) {
    checkAnswer();
  }
}

void onUnlockPush() {
  if (target == 0) {
    count = 0;
    target = random(2, 6);
    for (int i = 0; i < target; i++) {
      digitalWrite(led, HIGH);
      delay(300);
      digitalWrite(led, LOW);
      delay(300);
    }
    answerTimer = millis();
  } else {
    count++;
    digitalWrite(led, HIGH);
    delay(200);
    digitalWrite(led, LOW);
    delay(100);
    answerTimer = millis();
  }
}

void checkAnswer() {
  if (count == target) {
    target = 0;
    locked = false;
    openLock();
  } else {
    target = 0;
    errorMsg();
  }
}

void errorMsg() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(led, HIGH);
    delay(100);
    digitalWrite(led, LOW);
    delay(100);
  }
}

void showStatus() {
  if (locked && target == 0) {
    if (millis() - statusTimer > 1000) {
      digitalWrite(led, HIGH);
      delay(100);
      digitalWrite(led, LOW);
      statusTimer = millis();
    }
  }
}