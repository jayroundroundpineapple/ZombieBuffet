
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
import plantItem from "./plantItem";

/**怪物数据接口 */
interface MonsterData {
    node: cc.Node
    mosterItem: mosterItem
    positionIndex: number //当前在mosterMapPosArr中的位置索引
}

/**植物数据接口 */
interface PlantData {
    node: cc.Node
    plantItem: plantItem
    positionIndex: number //当前在plantMapPosArr中的位置索引
}


const { ccclass, property } = cc._decorator;

@ccclass
export default class GameUI extends cc.Component {
    @property(cc.Node)
    private mapNode:cc.Node = null; //地图
    @property(cc.Prefab)
    private mosterPre:cc.Prefab = null
    @property(cc.Prefab)
    private plantPre:cc.Prefab = null //植物预制体
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
    private plants: PlantData[] = [] //植物数组
    private dragStartPlant: PlantData = null //拖拽开始的植物
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
        const hpList = [12, 8, 11]
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
            monsterNode.setPosition(GameConf.mosterMapPosArr[posIndex])
            
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
        // 首先执行植物攻击（所有植物集火攻击最前面的怪物）
        this.performAllPlantsAttack()
        
        if(this.monsters.length === 0) return
        
        // 检查是否所有怪物都到达最后一个位置
        const allReachedEnd = this.monsters.every(monster => 
            monster.positionIndex >= GameConf.mosterMapPosArr.length - 1
        )
        
        if(allReachedEnd){
            // 游戏结束
            console.log('游戏结束！所有怪物已到达终点')
            this.gameEnd()
            return
        }
        
        // 所有怪物同时往前走一步
        this.monsters.forEach(monster => {
            if(monster.positionIndex < GameConf.mosterMapPosArr.length - 1){
                monster.positionIndex++
                monster.mosterItem.setPositionIndex(monster.positionIndex)
                const targetPos = GameConf.mosterMapPosArr[monster.positionIndex]
                
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
    
    /**
     * 执行所有植物攻击（集火攻击最前面的怪物）
     */
    private performAllPlantsAttack() {
        if(this.plants.length === 0 || this.monsters.length === 0) return
        
        // 计算所有植物的总攻击力
        let totalDamage = 0
        this.plants.forEach(plant => {
            if(plant.node && plant.node.isValid) {
                totalDamage += plant.plantItem.getAttackPower()
                // 播放攻击动画
                plant.plantItem.playAttackAnimation()
                // 攻击动画结束后恢复待机
                plant.plantItem.scheduleOnce(() => {
                    plant.plantItem.playIdleAnimation()
                }, 0.5)
            }
        })
        
        if(totalDamage <= 0) return
        
        // 处理伤害溢出：持续攻击最前面的怪物，直到伤害全部消耗或没有怪物
        let remainingDamage = totalDamage
        
        while(remainingDamage > 0 && this.monsters.length > 0) {
            // 每次重新找到最前面的怪物（positionIndex最大的）
            let frontMonster: MonsterData = null
            let maxIndex = -1
            
            this.monsters.forEach(monster => {
                if(monster.node && monster.node.isValid && monster.positionIndex > maxIndex) {
                    maxIndex = monster.positionIndex
                    frontMonster = monster
                }
            })
            
            if(!frontMonster) break
            
            const monsterHp = frontMonster.mosterItem.getHp()
            const damageToDeal = Math.min(remainingDamage, monsterHp)
            
            // 造成伤害
            const isDead = frontMonster.mosterItem.takeDamage(damageToDeal)
            remainingDamage -= damageToDeal
            
            if(isDead) {
                // 怪物死亡，移除
                this.removeMonster(frontMonster.node)
                // 继续循环，攻击下一个最前面的怪物
            } else {
                // 怪物没死，伤害已全部消耗
                break
            }
        }
    }
    
    /**
     * 创建植物
     */
    public createPlant(type: number, level: number, positionIndex: number): PlantData | null {
        if(!this.plantPre) {
            console.error('植物预制体未设置')
            return null
        }
        
        // 检查位置索引是否有效
        if(positionIndex < 0 || positionIndex >= GameConf.plantMapPosArr.length) {
            console.error(`植物位置索引超出范围：${positionIndex}，有效范围：0-${GameConf.plantMapPosArr.length - 1}`)
            return null
        }
        
        const plantNode = cc.instantiate(this.plantPre)
        plantNode.parent = this.mapNode
        
        const plantItemComponent = plantNode.getComponent(plantItem)
        if(!plantItemComponent){
            console.error('预制体上未找到plantItem组件，请确保已挂载plantItem脚本')
            plantNode.destroy()
            return null
        }
        
        // 设置植物属性
        plantItemComponent.setType(type)
        plantItemComponent.setLevel(level)
        plantItemComponent.setPositionIndex(positionIndex)
        
        // 设置位置（使用plantMapPosArr）
        plantNode.setPosition(GameConf.plantMapPosArr[positionIndex])
        
        const plantData: PlantData = {
            node: plantNode,
            plantItem: plantItemComponent,
            positionIndex: positionIndex
        }
        
        this.plants.push(plantData)
        
        // 添加拖拽事件
        this.setupPlantDrag(plantData)
        
        return plantData
    }
    
    /**
     * 设置植物拖拽事件
     */
    private setupPlantDrag(plantData: PlantData) {
        plantData.node.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventTouch) => {
            this.dragStartPlant = plantData
            event.stopPropagation()
        }, plantData.node)
        
        plantData.node.on(cc.Node.EventType.TOUCH_END, (event: cc.Event.EventTouch) => {
            if(!this.dragStartPlant || this.dragStartPlant !== plantData) return
            
            // 检查是否拖到另一个植物上
            // 直接检查所有植物，找到距离最近的
            let minDistance = Infinity
            let targetPlant: PlantData = null
            
            this.plants.forEach(plant => {
                if(plant === plantData) return // 跳过自己
                
                // 计算两个植物节点之间的距离
                const distance = plant.node.position.sub(plantData.node.position).mag()
                if(distance < 150 && distance < minDistance) { // 150像素范围内
                    minDistance = distance
                    targetPlant = plant
                }
            })
            
            if(targetPlant && plantData.plantItem.canMergeWith(targetPlant.plantItem)) {
                // 可以合成
                this.mergePlants(plantData, targetPlant)
            }
            
            this.dragStartPlant = null
            event.stopPropagation()
        }, plantData.node)
    }
    
    /**
     * 合成两个植物
     */
    private mergePlants(plant1: PlantData, plant2: PlantData) {
        // 将plant2的等级加到plant1上
        const newLevel = plant1.plantItem.getLevel() + plant2.plantItem.getLevel()
        plant1.plantItem.setLevel(newLevel)
        
        // 销毁plant2
        const index = this.plants.indexOf(plant2)
        if(index > -1) {
            this.plants.splice(index, 1)
        }
        plant2.node.destroy()
        
        console.log(`植物合成成功，新等级：${newLevel}`)
    }
    
    
    /**
     * 移除怪物
     */
    private removeMonster(monsterNode: cc.Node) {
        const index = this.monsters.findIndex(m => m.node === monsterNode)
        if(index > -1) {
            const monster = this.monsters[index]
            this.monsters.splice(index, 1)
            if(monster.node && monster.node.isValid) {
                monster.node.destroy()
            }
        }
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
