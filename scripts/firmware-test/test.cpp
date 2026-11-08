#include "Adafruit_TinyUSB.h"
#include "../../firmware/key_matrix_test/key_matrix_test.ino"
void tick(unsigned ms){auto end=clockUs+ms*1000;while(clockUs<end){loop();for(int r=6;r<10;r++)assert(modes[r]==INPUT);}}
void expect(const std::string&s){assert(Serial.out==s);Serial.out.clear();}
int main(){
 setup();Serial.out.clear();tick(20);expect("");
 // Contact bounce never reaches debounce threshold.
 for(int i=0;i<4;i++){pressed[0][1]=true;tick(2);pressed[0][1]=false;tick(2);}expect("");
 pressed[0][1]=true;tick(25);expect("SW1 DOWN\n");tick(100);expect("");
 pressed[0][1]=false;tick(25);expect("SW1 UP\n");
 // All 13 keys, including the two independent Mic switches.
 const int positions[13][2]={{0,1},{0,2},{1,0},{1,1},{1,2},{1,3},{2,0},{2,1},{2,2},{2,3},{3,1},{3,2},{3,3}};
 for(auto &p:positions)pressed[p[0]][p[1]]=true;
 tick(25);std::string want;for(int i=1;i<=13;i++)want+="SW"+std::to_string(i)+" DOWN\n";expect(want);
 for(auto &p:positions)pressed[p[0]][p[1]]=false;
 tick(25);want.clear();for(int i=1;i<=13;i++)want+="SW"+std::to_string(i)+" UP\n";expect(want);
 // Unpopulated positions cannot emit a key event.
 pressed[0][0]=pressed[0][3]=pressed[3][0]=true;tick(25);expect("");
 // A disconnected USB monitor must not stop scanning or retain stale press state.
 Serial.connected=false;pressed[0][1]=true;tick(25);assert(stable[0][1]);expect("");
 pressed[0][1]=false;tick(25);assert(!stable[0][1]);Serial.connected=true;expect("");
 std::cout<<"PASS: bounce, hold, release, 13-key concurrency, empty positions, USB disconnect, row high impedance\n";
}
