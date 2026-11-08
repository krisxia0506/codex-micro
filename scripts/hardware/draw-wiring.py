#!/usr/bin/env python3
"""Draw wiring instructions in the mirrored underside view of the v0.22 layout."""
from pathlib import Path
from html import escape

OUT = Path(__file__).resolve().parents[2] / 'docs/hardware/assets'
# Positions and SW numbers follow web/model.js. Units here are illustration px.
KEYS = [(1,-10,30,0,1,'任务 1'),(2,10,30,0,2,'任务 2'),
        (3,-30,10,1,0,'任务 3'),(4,-10,10,1,1,'任务 4'),
        (5,10,10,1,2,'任务 5'),(6,30,10,1,3,'任务 6'),
        (7,-30,-10,2,0,'Fast'),(8,-10,-10,2,1,'批准'),
        (9,10,-10,2,2,'拒绝'),(10,30,-10,2,3,'Fork'),
        (11,-10,-30,3,1,'Mic 左轴'),(12,10,-30,3,2,'Mic 右轴'),
        (13,30,-30,3,3,'发送')]
COLORS = ['#1268b3','#077b73','#7a48b4','#bd3076']
ROWS = ['#c54d13','#926213','#48752a','#b33b46']


def draw(mode):
    p = ['<svg xmlns="http://www.w3.org/2000/svg" width="1260" height="1260" viewBox="0 0 1260 1260" role="img">',
         '<rect width="1260" height="1260" fill="#f8fafc"/><g transform="translate(130 0)">',
         '<style>text{font-family:"PingFang SC","Microsoft YaHei",Arial,sans-serif;fill:#203148} .muted{fill:#7f8b9a}</style>']
    def txt(x,y,t,size=20,color=None,anchor=None):
        attrs = (f' style="fill:{color}"' if color else '') + (f' text-anchor="{anchor}"' if anchor else '')
        p.append(f'<text x="{x}" y="{y}" font-size="{size}"{attrs}>{escape(t)}</text>')
    def rect(x,y,w,h,fill,stroke='#a9b7c5',r=12,dash=False):
        p.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="2"'+(' stroke-dasharray="8 6"' if dash else '')+'/>')
    def path(points,color,width=5):
        d='M'+' L'.join(f'{x},{y}' for x,y in points)
        # A white sleeve makes crossing wires visibly insulated; only dots join.
        p.append(f'<path d="{d}" fill="none" stroke="#fff" stroke-width="{width+5}" stroke-linejoin="round"/>')
        p.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"/>')
    def dot(x,y,color,r=6):
        p.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" stroke="#fff" stroke-width="2"/>')
    def pos(k): return (500-k[1]*7,690-k[2]*7)
    def pad(k,a):
        x,y=pos(k)
        # Rear view: A on the right, B on the left, matching mirrored socket terminals.
        return (x+35,y+20) if a else (x-35,y+34)
    def diode(k,color):
        x,y=pad(k,False)
        path([(x,y),(x,y+16)],color)
        rect(x-9,y+16,18,29,'#e5a565','#8c541d',4)
        p.append(f'<rect x="{x-9}" y="{y+36}" width="18" height="5" fill="#161616"/>')
        path([(x,y+45),(x,y+56)],color)
        return (x,y+56)
    titles={'single':'① 先只接这一个键','columns':'② 先连每一竖列：底座 A 焊点','rows':'③ 再连每一横排：B 焊点先串二极管'}
    txt(45,52,titles[mode],32)
    txt(45,90,'背面接线视角：拆掉底盖，USB 口保持在上方。',23)
    txt(45,122,'已做左右镜像：背面左上是摇杆，右上是旋钮。不要再镜像本图。',19)
    rect(100,155,800,875,'#edf1f5','#7f91a5',48)
    for x,y in [(130,185),(870,185),(130,1000),(870,1000)]:
        p.append(f'<circle cx="{x}" cy="{y}" r="9" fill="#fff" stroke="#a1adba" stroke-width="2"/>')
    # Main board is deliberately enlarged and depicted from its back.
    rect(420,195,160,175,'#d9e9df','#5c806d',8)
    rect(468,170,64,33,'#b9c4ce','#788899',6)
    txt(500,191,'USB',18,anchor='middle')
    txt(500,263,'XIAO',23,anchor='middle')
    txt(500,288,'背面',20,anchor='middle')
    txt(500,350,'放大示意',14,anchor='middle')
    pins={}
    # Mirrored front edge-pad ordering; rows line up with D0..D6 on opposite side.
    for i,(left,right) in enumerate(zip(['5V','GND','3V3','D10','D9','D8','D7'],['D0','D1','D2','D3','D4','D5','D6'])):
        y=219+i*22
        for pin,x,tx,anch in [(left,420,433,'start'),(right,580,567,'end')]:
            pins[pin]=(x,y)
            rect(x-6,y-5,12,10,'#e9c875','#a88b40',1)
            txt(tx,y+5,pin,15,anchor=anch)
    # Identical physical silhouettes across all three steps.
    for x,label in [(290,'摇杆 · 不接'),(710,'旋钮 · 不接')]:
        p.append(f'<circle cx="{x}" cy="480" r="47" fill="#e1e6ed" stroke="#b8c2cf" stroke-width="2"/>')
        txt(x,486,label,17,'#7f8b9a',anchor='middle')
    p.append('<circle cx="710" cy="900" r="46" fill="#e1e6ed" stroke="#b8c2cf" stroke-width="2"/>')
    txt(710,906,'触控区 · 不接',16,'#7f8b9a',anchor='middle')
    rect(367,850,266,106,'none','#93a1b1',15,True)
    for k in KEYS:
        n,_,_,r,c,name=k;x,y=pos(k)
        active=mode!='single' or n==1
        rect(x-58,y-47,116,96,'#fff' if active else '#e5e9ee','#879aaf' if active else '#c7cfd9',12)
        txt(x,y-27,f'SW{n}',17,None if active else '#8d98a5',anchor='middle')
        txt(x,y-7,name,16,None if active else '#8d98a5',anchor='middle')
        # Socket outline is schematic, with electrical pads outside the plastic body.
        p.append(f'<path d="M{x-30} {y+14} H{x+18} V{y+4} H{x+29} V{y+27} H{x-18} V{y+40} H{x-30} Z" fill="'+('#3e4854' if active else '#bdc6d1')+'"/>')
        for a in [True,False]:
            px,py=pad(k,a);rect(px-8,py-7,16,14,'#dbbd72' if active else '#cdd2d9','#a68a47' if active else '#c0c7d0',2)
            txt(px if a else px-14,py-13 if a else py+5,'A' if a else 'B',15,None if active else '#a4adb8',anchor='middle' if a else 'end')
    if mode=='single':
        k=KEYS[0];ax,ay=pad(k,True);bx,by=pad(k,False)
        # Separate right-side routes from D1 and D6 to the real SW1 position.
        path([pins['D1'],(803,241),(803,430),(ax,430),(ax,ay)],COLORS[1])
        end=diode(k,ROWS[0]);path([end,(845,end[1]),(845,351),pins['D6']],ROWS[0])
        for x,y in [pins['D1'],(ax,ay)]:dot(x,y,COLORS[1])
        for x,y in [pins['D6'],(bx,by),end]:dot(x,y,ROWS[0])
        txt(651,417,'D1 → A 焊点',18,COLORS[1])
        txt(647,555,'黑环这一头 → D6',19,ROWS[0])
        txt(45,1080,'只用：1 个底座 + 1 个轴 + 1 颗 1N4148 + 两根软线。',23)
        txt(45,1120,'绿色线：D1 接 A。棕色线：B 接二极管无环端，黑环端接 D6。',21)
        txt(45,1160,'插上轴并刷入测试程序：按下看 SW1 DOWN，松开看 SW1 UP。',21)
    elif mode=='columns':
        for c,color in enumerate(COLORS):
            group=[k for k in KEYS if k[4]==c]
            x=pad(group[0],True)[0]+24
            lane=382+c*16;right=850-c*18
            path([pins[f'D{c}'],(right,pins[f'D{c}'][1]),(right,lane),(x,lane),(x,pad(group[-1],True)[1])],color)
            dot(*pins[f'D{c}'],color)
            for k in group:
                px,py=pad(k,True);path([(x,py),(px,py)],color);dot(x,py,color);dot(px,py,color)
            txt(x,465,f'D{c}',19,color,anchor='middle')
        txt(45,1080,'每一竖列的 A 焊点串在一起，再接对应的 D 引脚。',23)
        txt(45,1120,'从背面左到右：D3（SW6/10/13）→ D2 → D1 → D0（SW3/7）。',20)
        txt(45,1160,'这一张只画 A 侧；B 侧暂时不接，下一张再焊二极管。',21)
    else:
        for r,color in enumerate(ROWS):
            group=[k for k in KEYS if k[3]==r];ends=[]
            for k in group:
                ends.append(diode(k,color));dot(*pad(k,False),color)
            bus=ends[0][1];pin=f'D{[6,7,8,9][r]}'
            if r==0:
                path([pins[pin],(858,pins[pin][1]),(858,bus),(min(x for x,y in ends),bus)],color)
            else:
                rail=143+r*18
                path([pins[pin],(rail,pins[pin][1]),(rail,bus),(max(x for x,y in ends),bus)],color)
            for e in ends:dot(*e,color)
            dot(*pins[pin],color)
            txt(795,bus+7,pin,21,color)
        txt(45,1080,'每个 B 焊点各接一颗二极管：无环端靠底座，黑环端向下。',22)
        txt(45,1120,'每排黑环端相连：第一排 D6；第二排 D7；第三排 D8；第四排 D9。',21)
        txt(45,1160,'与第②张叠加后完成全部接线；二极管实际可沿软线移到周边空位。',20)
    txt(45,1201,'● 实心圆点才是连接处；不同颜色线交叉不焊在一起，保持绝缘。',19)
    txt(45,1234,'断电焊接。5V / 3V3 / GND / BAT 均不接按键。图示走线路径需实物检查净空。',17,'#667789')
    p.append('</g></svg>')
    return '\n'.join(p)+'\n'

if __name__=='__main__':
    for mode in ['single','columns','rows']:
        (OUT/f'wiring-{mode}.svg').write_text(draw(mode))
