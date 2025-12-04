
import { GameModel } from "./GameModel";
import { LanguageManager } from "./language/LanguageManager";
import { myGameModel } from "./myGameModel";
import RESSpriteFrame from "./RESSpriteFrame";
import Anim from "./utils/Anim";
import EffectUtils from "./utils/EffectUtils";
import GuideEffect from "./utils/GuideEffect";
import MoneyChange from "./utils/MoneyChange";
import NotifyEffect from "./utils/NotifyEffect";
import Utils from "./utils/Utils";
import { GameConf } from "./GameConf";
import mosterItem from "./mosterItem";

/**怪物数据接口 */
interface MonsterData {
    node: cc.Node
    mosterItem: mosterItem
    positionIndex: number //当前在floorPosArr中的位置索引
}


const { ccclass, property } = cc._decorator;

@ccclass
export default class GameUI extends cc.Component {
    @property(cc.Node)
    private mapNode:cc.Node = null; //地图
    @property(cc.Prefab)
    private mosterPre:cc.Prefab = null
    @property(cc.Node)
    private finger:cc.Node = null;
    @property(cc.Node)
    private bgNode:cc.Node = null
    @property(cc.Node)
    private maxBg:cc.Node = null
    @property(cc.Node)
    private maskNode:cc.Node = null
    @property(cc.Node)
    private resultNode:cc.Node = null
    @property(cc.Button)
    private moveButton:cc.Button = null //移动按钮


    private bgmAudioFlag:boolean = true
    private canPlayMusic:boolean = false
    private gameModel: GameModel = null
    private monsters: MonsterData[] = [] //怪物数组
    protected onLoad(): void {
        this.gameModel = new GameModel()
        this.gameModel.mGame = this
    }
    protected start(): void {
        PlayerAdSdk.init();
        this.resize()
        let that = this;
        /**屏幕旋转尺寸改变 */
        cc.view.setResizeCallback(() => {
            that.resize();
        })
        cc.find('Canvas').on('touchstart',()=>{
            this.canPlayMusic = true
            this.bgmAudioFlag && cc.audioEngine.play(RESSpriteFrame.instance.bgmAudioClip,false,1)   
            this.bgmAudioFlag = false
        })
        this.resize()
        this.initGame()
        // 绑定移动按钮
        if(this.moveButton){
            this.moveButton.node.on('click', this.onMoveButtonClick, this)
        }
    }
    private initGame(){
        // 清空之前的怪物
        this.monsters.forEach(monster => {
            if(monster.node && monster.node.isValid){
                monster.node.destroy()
            }
        })
        this.monsters = []
        
        // 创建三个怪物，血条分别为11/8/12
        const hpList = [11, 8, 12]
        // 初始位置索引：最后一只在索引0(-268)，第二只在索引1(-160)，第一只在索引2(-50)
        const initialPosIndexes = [0, 1, 2]
        
        for(let i = 0; i < 3; i++){
            const monsterNode = cc.instantiate(this.mosterPre)
            monsterNode.parent = this.mapNode
            
            // 获取mosterItem组件（应该在预制体上已经挂载）
            const monsterItemComponent = monsterNode.getComponent(mosterItem)
            if(!monsterItemComponent){
                console.error('预制体上未找到mosterItem组件，请确保已挂载mosterItem脚本')
                continue
            }
            
            // 设置血条数量（hpLabel在编辑器中已设置好位置和字体大小）
            const posIndex = initialPosIndexes[i]
            monsterItemComponent.setHp(hpList[i])
            monsterItemComponent.setPositionIndex(posIndex)
            
            // 设置初始位置
            monsterNode.setPosition(GameConf.floorPosArr[posIndex])
            
            // 创建怪物数据
            const monsterData: MonsterData = {
                node: monsterNode,
                mosterItem: monsterItemComponent,
                positionIndex: posIndex
            }
            
            this.monsters.push(monsterData)
        }
    }
    
    /**移动按钮点击事件 */
    private onMoveButtonClick(){
        if(this.monsters.length === 0) return
        
        // 检查是否所有怪物都到达最后一个位置
        const allReachedEnd = this.monsters.every(monster => 
            monster.positionIndex >= GameConf.floorPosArr.length - 1
        )
        
        if(allReachedEnd){
            // 游戏结束
            console.log('游戏结束！所有怪物已到达终点')
            this.gameEnd()
            return
        }
        
        // 所有怪物同时往前走一步
        this.monsters.forEach(monster => {
            if(monster.positionIndex < GameConf.floorPosArr.length - 1){
                monster.positionIndex++
                monster.mosterItem.setPositionIndex(monster.positionIndex)
                const targetPos = GameConf.floorPosArr[monster.positionIndex]
                
                // 播放移动动画
                monster.mosterItem.playWalkAnimation()
                
                // 使用缓动动画移动
                cc.tween(monster.node)
                    .to(0.8, { position: targetPos }, { easing: 'sineOut' })
                    .call(()=>{
                        // 播放待机动画
                        monster.mosterItem.playIdleAnimation()
                    })
                    .start()
            }
        })
    }
    
    /**游戏结束 */
    private gameEnd(){
        console.log('游戏结束')
        // 可以在这里添加游戏结束的逻辑
        if(this.moveButton){
            this.moveButton.interactable = false
        }
    }
    private getRandomInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    private resize() {
        const canvasValue: any = cc.Canvas.instance;
        let frameSize = cc.view.getFrameSize();
        let isVerTical = cc.winSize.height > cc.winSize.width
        if (isVerTical) {//竖屏
            if (cc.winSize.width / cc.winSize.height > 0.7) {
                cc.Canvas.instance.fitHeight = true;
                cc.Canvas.instance.fitWidth = false;
            } else {
            cc.Canvas.instance.fitHeight = false;
                cc.Canvas.instance.fitWidth = true;
            }
        } else {
            cc.Canvas.instance.fitHeight = true;
            cc.Canvas.instance.fitWidth = false;
        }
        cc.director.getScene().getComponentsInChildren(cc.Widget).forEach(function (t) {
            t.updateAlignment()
        });
        this.maxBg.active = !isVerTical
    }
    private cashoutFunc() {
        console.log('跳转');
        this.canPlayMusic && cc.audioEngine.play(RESSpriteFrame.instance.clickAudioClip, false, 1)
        PlayerAdSdk.gameEnd()
        PlayerAdSdk.jumpStore()
    }
    protected onDisable(): void {
        // 清理事件监听
        if(this.moveButton){
            this.moveButton.node.off('click', this.onMoveButtonClick, this)
        }
    }
}   
