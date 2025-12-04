export const enum JarType{
    Orange = 0,
    Pink = 1,
    Green = 2
}
export const enum MosterType{
    moster1 = 0,
    moster2 = 1
}
export const enum plantType{
    cao = 0, //四叶草
    dangong = 1 //弹弓
}
export class GameConf{
    public static floorPosY = 35

    /**moster地图的11个格子按顺序的位置 */
    public static mosterMapPosArr:cc.Vec3[] = [
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

    /**plant地图的5个格子按顺序的位置 */
    public static plantMapPosArr:cc.Vec3[] = [
        cc.v3(-53,-109, 0),
        cc.v3(165, -109, 0),
        cc.v3(-53,-225, 0)
    ]
}

window['GameConf'] = GameConf