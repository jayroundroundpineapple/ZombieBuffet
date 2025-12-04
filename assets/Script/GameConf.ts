export const enum JarType{
    Orange = 0,
    Pink = 1,
    Green = 2
}
export const enum MosterType{
    moster1 = 0,
    moster2 = 1
}
export const enum heroType{
    hero1 = 0,
    hero2 = 1
}
export class GameConf{
    public static floorPosY = 35

    /**地图的11个格子按顺序的位置 */
    public static floorPosArr:cc.Vec3[] = [
        cc.v3(-268,335, 0),
        cc.v3(-160,335, 0),
        cc.v3(-50, 335, 0),  
        cc.v3(-50, 222, 0),  
        cc.v3(-50, 116, 0),  
        cc.v3(-50, 5, 0),  
        cc.v3(60, 5, 0),  
        cc.v3(60, -105, 0),  
        cc.v3(60, -210, 0),  
        cc.v3(60, -320, 0),  
        cc.v3(60, -430, 0), 
    ]
}

window['GameConf'] = GameConf