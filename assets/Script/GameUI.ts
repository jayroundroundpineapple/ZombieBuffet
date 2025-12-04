
import { GameModel } from "./GameModel";
import RESSpriteFrame from "./RESSpriteFrame";
import { GameConf, plantType } from "./GameConf";
import mosterItem from "./mosterItem";
import plantItem from "./plantItem";
import bulletItem from "./bulletItem";

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
    targetMapPlantIndex?: number //指定的合成目标（地图植物的位置索引），-1表示无指定目标
}


const { ccclass, property } = cc._decorator;

@ccclass
export default class GameUI extends cc.Component {
    @property(cc.Node)
    private bottomPlantBox:cc.Node = null; //底部植物盒子
    @property(cc.Node)
    private mapNode:cc.Node = null; //地图
    @property(cc.Prefab)
    private mosterPre:cc.Prefab = null
    @property(cc.Prefab)
    private plantPre:cc.Prefab = null //植物预制体
    @property(cc.Prefab)
    private bulletPre:cc.Prefab = null //子弹预制体
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
    private bulletPool: cc.Node[] = [] //子弹节点池（空闲）
    private activeBullets: cc.Node[] = [] //活跃的子弹
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
        // 初始化底部植物盒子中的植物
        this.initBottomPlantBox()
        //创建地图上一开始有的植物
        // targetMapPlantIndex: 指定要合成的地图植物位置索引，-1表示无指定目标
        this.createPlant(plantType.cao, 2, 0, -1)
        this.createPlant(plantType.cao, 2, 1, 0)
        this.createPlant(plantType.dangong, 1, 2, -1)
        // 清空之前的怪物
        this.monsters.forEach(monster => {
            if(monster.node && monster.node.isValid){
                monster.node.destroy()
            }
        })
        this.monsters = []
        
        // 创建三个怪物，血条分别为11/8/12
        const hpList = [12, 8, 11]
        const typeList = [3, 3, 1]
        // 初始位置索引：最后一只在索引0(-268)，第二只在索引1(-160)，第一只在索引2(-50)
        const initialPosIndexes = [0, 1, 2]
        
        for(let i = 0; i < 3; i++){
            const monsterNode = cc.instantiate(this.mosterPre)
            monsterNode.parent = this.mapNode
            
            // 获取mosterItem组件（应该在预制体上已经挂载）
            const monsterItemComponent = monsterNode.getComponent(mosterItem)
            monsterItemComponent.setType(typeList[i])
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
    
    /**
     * 初始化底部植物盒子
     */
    private initBottomPlantBox() {
        if(!this.bottomPlantBox) {
            console.error('底部植物盒子未设置')
            return
        }
        
        // 创建3只植物：level=1的dangong, level=2的dangong, level=4的cao
        // targetMapPlantIndex: 指定要合成的地图植物位置索引，-1表示无指定目标
        const plantConfigs = [
            { type: plantType.dangong, level: 1, x: -218, y: 30, targetMapPlantIndex: 2 },
            { type: plantType.dangong, level: 2, x: -88, y: 30, targetMapPlantIndex: 2 }, // 指定与地图位置2的植物合成
            { type: plantType.cao, level: 4, x: 45, y: 30, targetMapPlantIndex: 0 }
        ]
        
        plantConfigs.forEach(config => {
            this.createPlantInBox(config.type, config.level, config.x, config.y, config.targetMapPlantIndex)
        })
    }
    
    /**
     * 在底部植物盒子中创建植物
     */
    private createPlantInBox(type: number, level: number, x: number, y: number, targetMapPlantIndex: number = -1): PlantData | null {
        if(!this.plantPre) {
            console.error('植物预制体未设置')
            return null
        }
        
        if(!this.bottomPlantBox) {
            console.error('底部植物盒子未设置')
            return null
        }
        
        const plantNode = cc.instantiate(this.plantPre)
        plantNode.parent = this.bottomPlantBox
        
        const plantItemComponent = plantNode.getComponent(plantItem)
        if(!plantItemComponent){
            console.error('预制体上未找到plantItem组件，请确保已挂载plantItem脚本')
            plantNode.destroy()
            return null
        }
        plantItemComponent.setType(type)
        plantItemComponent.setLevel(level)
        plantItemComponent.setPositionIndex(-1) // 底部盒子的植物使用-1作为标识
        plantNode.setPosition(x, y, 0)
        
        const plantData: PlantData = {
            node: plantNode,
            plantItem: plantItemComponent,
            positionIndex: -1, // 底部盒子的植物positionIndex为-1
            targetMapPlantIndex: targetMapPlantIndex // 指定的合成目标
        }
        
        this.plants.push(plantData)
        
        // 添加拖拽事件（支持拖到地图或合成）
        this.setupPlantDragFromBox(plantData)
        
        return plantData
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
                        if(monster.node && monster.node.isValid && !monster.mosterItem.isDead()){
                            monster.mosterItem.playIdleAnimation()
                        }
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
        
        // 找到最前面的怪物（作为所有植物的目标）
        let frontMonster: MonsterData = null
        let maxIndex = -1
        
        this.monsters.forEach(monster => {
            if(monster.node && monster.node.isValid && monster.positionIndex > maxIndex) {
                maxIndex = monster.positionIndex
                frontMonster = monster
            }
        })
        
        if(!frontMonster) return
        
        const targetMonsterNode = frontMonster.node
        // 获取怪物在世界坐标系中的位置（相对于mapNode）
        const targetPos = targetMonsterNode.position.clone()
        
        // 计算所有植物的总攻击力（只计算地图上的植物，不包括底部盒子的植物）
        let totalDamage = 0
        this.plants.forEach(plant => {
            if(plant.node && plant.node.isValid && plant.positionIndex >= 0) {
                // 只计算地图上的植物（positionIndex >= 0）
                totalDamage += plant.plantItem.getAttackPower()
                
                // 播放攻击动画
                plant.plantItem.playAttackAnimation()
                // 生成子弹（每个植物射向同一个目标怪物）
                this.createBullet(plant, targetMonsterNode)
                // 攻击动画结束后恢复待机
                plant.plantItem.scheduleOnce(() => {
                    plant.plantItem.playIdleAnimation()
                }, 0.5)
            }
        })
        
        if(totalDamage <= 0) return
        
        // 延迟处理伤害（等待子弹到达）
        this.scheduleOnce(() => {
            this.applyDamageToMonster(totalDamage)
        }, 0.5) // 假设子弹飞行时间约0.5秒
    }
    
    /**
     * 对怪物造成伤害
     */
    private applyDamageToMonster(totalDamage: number) {
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
                frontMonster.mosterItem.playDeadAnimation(()=>{
                    this.removeMonster(frontMonster.node)
                })
                // 继续循环，攻击下一个最前面的怪物
            } else {
                // 怪物没死，伤害已全部消耗
                break
            }
        }
    }
    
    /**
     * 创建子弹
     */
    private createBullet(plant: PlantData, targetMonsterNode: cc.Node) {
        // 从节点池获取子弹
        let bulletNode: cc.Node = null
        
        if(this.bulletPool.length > 0) {
            // 从池中取出（节点已经在mapNode下，不需要重新设置父节点）
            bulletNode = this.bulletPool.pop()
            if(!bulletNode || !bulletNode.isValid) {
                bulletNode = cc.instantiate(this.bulletPre)
                bulletNode.parent = this.mapNode
            } else {
                bulletNode.active = true
            }
        } else {
            // 创建新子弹
            bulletNode = cc.instantiate(this.bulletPre)
            bulletNode.parent = this.mapNode
        }
        
        // 获取bulletItem组件
        const bulletComponent = bulletNode.getComponent(bulletItem)
        if(!bulletComponent) {
            console.error('子弹预制体上未找到bulletItem组件')
            if(bulletNode && bulletNode.isValid) {
                bulletNode.destroy()
            }
            return
        }
        
        // 获取植物位置（相对于mapNode的世界坐标）
        // const plantPos = plant.node.position.clone()
        const plantPos = GameConf.plantMapPosArr[plant.positionIndex]
        
        // 获取怪物位置（相对于mapNode的世界坐标）
        const targetPos = targetMonsterNode.position.clone()
        
        // 确保子弹节点是激活的
        bulletNode.active = true
        
        bulletComponent.init(
            plant.plantItem.getType(),
            plant.plantItem.getLevel(),
            plantPos,
            targetPos,
            targetMonsterNode
        )
        
        // 设置爆炸完成回调，回收子弹
        bulletComponent.setExplosionCallback(() => {
            this.recycleBullet(bulletNode)
        })
        // 添加到活跃列表
        this.activeBullets.push(bulletNode)
    }
    
    /**
     * 回收子弹到节点池
     */
    private recycleBullet(bulletNode: cc.Node) {
        if(!bulletNode || !bulletNode.isValid) return
        
        // 从活跃列表移除
        const index = this.activeBullets.indexOf(bulletNode)
        if(index > -1) {
            this.activeBullets.splice(index, 1)
        }
        // 重置子弹
        const bulletComponent = bulletNode.getComponent(bulletItem)
        if(bulletComponent) {
            bulletComponent.reset()
        }
        // 隐藏并回收到池中
        bulletNode.active = false
        this.bulletPool.push(bulletNode)
    }
    
    /**
     * 创建植物
     */
    public createPlant(type: number, level: number, positionIndex: number, targetMapPlantIndex: number = -1): PlantData | null {
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
            positionIndex: positionIndex,
            targetMapPlantIndex: targetMapPlantIndex // 指定的合成目标
        }
        
        this.plants.push(plantData)
        
        // 添加拖拽事件
        this.setupPlantDrag(plantData)
        
        return plantData
    }
    
    /**
     * 设置底部盒子植物的拖拽事件（可以拖到地图或合成）
     */
    private setupPlantDragFromBox(plantData: PlantData) {
        let startPos: cc.Vec3 = null
        
        plantData.node.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventTouch) => {
            this.dragStartPlant = plantData
            startPos = plantData.node.position.clone()
            event.stopPropagation()
        }, plantData.node)
        
        plantData.node.on(cc.Node.EventType.TOUCH_MOVE, (event: cc.Event.EventTouch) => {
            if(!this.dragStartPlant || this.dragStartPlant !== plantData) return
            // 跟随手指移动（使用本地坐标）
            const delta = event.getDelta()
            const currentPos = plantData.node.position
            plantData.node.setPosition(
                currentPos.x + delta.x,
                currentPos.y + delta.y,
                currentPos.z
            )
        }, plantData.node)
        
        plantData.node.on(cc.Node.EventType.TOUCH_END, (event: cc.Event.EventTouch) => {
            if(!this.dragStartPlant || this.dragStartPlant !== plantData) {
                startPos = null
                return
            }
            
            // 检查是否有指定的合成目标（点击自动合成）
            if(plantData.targetMapPlantIndex !== undefined && plantData.targetMapPlantIndex >= 0) {
                const targetPlant = this.plants.find(p => p.positionIndex === plantData.targetMapPlantIndex)
                if(targetPlant && plantData.plantItem.canMergeWith(targetPlant.plantItem)) {
                    // 直接与指定的地图植物合成
                    this.mergePlants(plantData, targetPlant, targetPlant)
                    this.dragStartPlant = null
                    startPos = null
                    event.stopPropagation()
                    return
                }
            }
            
            // 获取触摸结束时的世界位置
            const endWorldPos = plantData.node.position
            
            // 检查是否拖到其他植物位置（合成）
            let targetPlant: PlantData = null
            let minDistance = Infinity
            
            this.plants.forEach(plant => {
                if(plant === plantData) return // 跳过自己
                
                // 计算世界位置距离
                const plantWorldPos = plant.node.position
                const distance = endWorldPos.sub(plantWorldPos).mag()
                
                // 底部植物可以拖到地图植物或其他底部植物
                // 地图植物只能拖到其他地图植物
                if(plantData.positionIndex === -1) {
                    // 底部植物：可以拖到地图植物或其他底部植物
                    if(distance < 100 && distance < minDistance) { // 100像素范围内
                        minDistance = distance
                        targetPlant = plant
                    }
                } else {
                    // 地图植物：只能拖到其他地图植物
                    if(plant.positionIndex >= 0 && distance < 100 && distance < minDistance) {
                        minDistance = distance
                        targetPlant = plant
                    }
                }
            })
            
            if(targetPlant && plantData.plantItem.canMergeWith(targetPlant.plantItem)) {
                // 可以合成（plantData拖动到targetPlant，保留targetPlant的位置）
                this.mergePlants(plantData, targetPlant, targetPlant)
            } else {
                // 检查是否拖到地图上的空位置（只有底部植物可以放置到地图）
                if(plantData.positionIndex === -1) {
                    const targetMapIndex = this.getNearestMapPosition(endWorldPos)
                    if(targetMapIndex >= 0) {
                        // 放置到地图上
                        this.placePlantOnMap(plantData, targetMapIndex)
                    } else {
                        // 拖到无效位置，返回原位置
                        if(startPos) {
                            plantData.node.setPosition(startPos)
                        }
                    }
                } else {
                    // 地图植物如果没有合成，返回原位置
                    if(startPos) {
                        plantData.node.setPosition(startPos)
                    }
                }
            }
            
            this.dragStartPlant = null
            startPos = null
            event.stopPropagation()
        }, plantData.node)
    }
    
    /**
     * 设置地图上植物的拖拽事件（只能合成）
     */
    private setupPlantDrag(plantData: PlantData) {
        let startPos: cc.Vec3 = null
        
        plantData.node.on(cc.Node.EventType.TOUCH_START, (event: cc.Event.EventTouch) => {
            this.dragStartPlant = plantData
            startPos = plantData.node.position.clone()
            event.stopPropagation()
        }, plantData.node)
        
        plantData.node.on(cc.Node.EventType.TOUCH_MOVE, (event: cc.Event.EventTouch) => {
            if(!this.dragStartPlant || this.dragStartPlant !== plantData) return
            
            // 跟随手指移动（使用本地坐标）
            const delta = event.getDelta()
            const currentPos = plantData.node.position
            plantData.node.setPosition(
                currentPos.x + delta.x,
                currentPos.y + delta.y,
                currentPos.z
            )
        }, plantData.node)
        
        plantData.node.on(cc.Node.EventType.TOUCH_END, (event: cc.Event.EventTouch) => {
            if(!this.dragStartPlant || this.dragStartPlant !== plantData) {
                startPos = null
                return
            }
            
            // 检查是否有指定的合成目标（点击自动合成）
            if(plantData.targetMapPlantIndex !== undefined && plantData.targetMapPlantIndex >= 0) {
                const targetPlant = this.plants.find(p => p.positionIndex === plantData.targetMapPlantIndex)
                if(targetPlant && plantData.plantItem.canMergeWith(targetPlant.plantItem)) {
                    // 直接与指定的地图植物合成
                    this.mergePlants(plantData, targetPlant, targetPlant)
                    this.dragStartPlant = null
                    startPos = null
                    event.stopPropagation()
                    return
                }
            }
            
            // 检查是否拖到另一个植物上（地图植物只能拖到其他地图植物）
            let minDistance = Infinity
            let targetPlant: PlantData = null
            
            this.plants.forEach(plant => {
                if(plant === plantData) return // 跳过自己
                
                // 地图植物只能拖到其他地图植物
                if(plant.positionIndex < 0) return // 跳过底部盒子的植物
                
                // 计算两个植物节点之间的距离
                const distance = plant.node.position.sub(plantData.node.position).mag()
                if(distance < 150 && distance < minDistance) { // 150像素范围内
                    minDistance = distance
                    targetPlant = plant
                }
            })
            
            if(targetPlant && plantData.plantItem.canMergeWith(targetPlant.plantItem)) {
                // 可以合成（plantData拖动到targetPlant，保留targetPlant的位置）
                this.mergePlants(plantData, targetPlant, targetPlant)
            } else {
                // 如果没有合成，返回原位置
                if(startPos) {
                    plantData.node.setPosition(startPos)
                }
            }
            
            this.dragStartPlant = null
            startPos = null
            event.stopPropagation()
        }, plantData.node)
    }
    
    /**
     * 获取最近的空地图位置索引
     */
    private getNearestMapPosition(screenPos: cc.Vec3): number {
        if(!this.mapNode) return -1
        
        let nearestIndex = -1
        let minDistance = Infinity
        
        // 检查哪些位置已经被占用
        const occupiedPositions = new Set<number>()
        this.plants.forEach(plant => {
            if(plant.positionIndex >= 0) {
                occupiedPositions.add(plant.positionIndex)
            }
        })
        
        // 找到最近的空位置
        for(let i = 0; i < GameConf.plantMapPosArr.length; i++) {
            if(occupiedPositions.has(i)) continue // 跳过已被占用的位置
            
            const mapPos = GameConf.plantMapPosArr[i]
            const distance = Math.sqrt(
                Math.pow(screenPos.x - mapPos.x, 2) + 
                Math.pow(screenPos.y - mapPos.y, 2)
            )
            
            if(distance < 100 && distance < minDistance) { // 100像素范围内
                minDistance = distance
                nearestIndex = i
            }
        }
        
        return nearestIndex
    }
    
    /**
     * 将植物放置到地图上
     */
    private placePlantOnMap(plantData: PlantData, mapIndex: number) {
        // 更新植物位置索引
        plantData.positionIndex = mapIndex
        plantData.plantItem.setPositionIndex(mapIndex)
        // 改变父节点到地图
        plantData.node.parent = this.mapNode
        // 设置位置
        plantData.node.setPosition(GameConf.plantMapPosArr[mapIndex])
        // 更新拖拽事件（地图上的植物只能合成）
        plantData.node.off(cc.Node.EventType.TOUCH_START)
        plantData.node.off(cc.Node.EventType.TOUCH_MOVE)
        plantData.node.off(cc.Node.EventType.TOUCH_END)
        this.setupPlantDrag(plantData)
    }
    /**
     * 将植物返回到底部盒子（拖到无效位置时）
     */
    private returnPlantToBox(plantData: PlantData) {
        // 恢复到底部盒子
        plantData.node.parent = this.bottomPlantBox
        // 恢复原始位置（根据类型和等级找到原始位置，这里简化处理）
        // 可以根据需要优化，这里先放回中心
        plantData.node.setPosition(0, 0, 0)
    }
    
    /**
     * 合成两个植物
     * @param draggedPlant 被拖动的植物（会被销毁）
     * @param targetPlant 目标植物（被拖到的植物，会保留位置）
     * @param keepPlant 保留的植物（可选，如果不提供则自动判断）
     */
    private mergePlants(draggedPlant: PlantData, targetPlant: PlantData, keepPlant?: PlantData) {
        // 检查是否可以合成
        if(!draggedPlant.plantItem.canMergeWith(targetPlant.plantItem)) {
            console.log('植物不能合成：类型或等级不匹配')
            return
        }
        let finalKeepPlant: PlantData = keepPlant || targetPlant
        let removePlant: PlantData = draggedPlant
        
        if(!keepPlant) {
            if(draggedPlant.positionIndex === -1 && targetPlant.positionIndex >= 0) {
                finalKeepPlant = targetPlant
                removePlant = draggedPlant
            }
            else if(targetPlant.positionIndex === -1 && draggedPlant.positionIndex >= 0) {
                finalKeepPlant = draggedPlant
                removePlant = targetPlant
            }
            // 如果都在地图上，保留targetPlant（被拖到的植物）
            // 如果都在底部盒子，保留targetPlant（被拖到的植物）
            else {
                finalKeepPlant = targetPlant
                removePlant = draggedPlant
            }
        }
        
        // 保存目标植物的位置（确保合成后位置不变）
        const targetPosition = finalKeepPlant.node.position.clone()
        const targetPositionIndex = finalKeepPlant.positionIndex
        
        // 计算新等级（两个相同等级的植物合成，等级相加）
        const oldLevel = finalKeepPlant.plantItem.getLevel()
        const removeLevel = removePlant.plantItem.getLevel()
        const newLevel = oldLevel + removeLevel
        
        // 更新保留植物的等级（会自动更新spine皮肤和伤害）
        finalKeepPlant.plantItem.setLevel(newLevel)
        
        // 确保保留植物在目标位置（防止位置偏移）
        finalKeepPlant.node.setPosition(targetPosition)
        finalKeepPlant.positionIndex = targetPositionIndex
        finalKeepPlant.plantItem.setPositionIndex(targetPositionIndex)
        
        // 销毁被移除的植物
        const index = this.plants.indexOf(removePlant)
        if(index > -1) {
            this.plants.splice(index, 1)
        }
        removePlant.node.destroy()
        this.onMoveButtonClick()
        console.log(`植物合成成功：${oldLevel}级 + ${removeLevel}级 = ${newLevel}级，新攻击力：${newLevel}，位置保持在目标植物位置`)
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
