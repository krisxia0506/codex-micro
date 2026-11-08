#pragma once
#include <cassert>
#include <cstdint>
#include <string>
#include <iostream>
#define D0 0
#define D1 1
#define D2 2
#define D3 3
#define D6 6
#define D7 7
#define D8 8
#define D9 9
#define INPUT 0
#define INPUT_PULLUP 1
#define OUTPUT 2
#define LOW 0
#define HIGH 1
inline uint64_t clockUs=0;
inline int modes[10]={};
inline int latch[10]={};
inline bool pressed[4][4]={};
inline uint32_t millis(){return clockUs/1000;}
inline void delay(unsigned x){clockUs+=x*1000;}
inline void delayMicroseconds(unsigned x){clockUs+=x;}
inline void pinMode(int p,int m){modes[p]=m;}
inline void digitalWrite(int p,int v){latch[p]=v;}
inline int digitalRead(int c){
 assert(modes[c]==INPUT_PULLUP);
 int selected=-1;
 for(int r=0;r<4;r++) if(modes[6+r]==OUTPUT){assert(selected==-1);assert(latch[6+r]==LOW);selected=r;}
 assert(selected>=0);
 return pressed[selected][c]?LOW:HIGH;
}
struct Port {
 bool connected=true;std::string out;
 operator bool() const{return connected;}
 void begin(int){}
 void print(const char*s){out+=s;}
 void print(uint8_t n){out+=std::to_string(n);}
 void println(const char*s){out+=std::string(s)+"\n";}
};
inline Port Serial;
