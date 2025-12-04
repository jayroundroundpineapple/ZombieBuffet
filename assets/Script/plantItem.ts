const { ccclass, property } = cc._decorator;

@ccclass
export default class plantItem extends cc.Component {
    @property(cc.Label)
    private levelLb:cc.Label = null; //等级Label
    @property(sp.SkeletonData)
    private spineDataArr:sp.SkeletonData[] = []; // spine动画
    @property(cc.Node)
    private spineNode:cc.Node = null
    @property(cc.Prefab)
    private bulletPre:cc.Prefab = null; //子弹预制体

    private plantType: number = 0; //植物种类
    private level: number = 1; //植物等级
    private positionIndex: number = 0; //当前在mosterMapPosArr中的位置索引
    private attackTimer: number = 0; //攻击计时器
    private attackInterval: number = 1.0; //攻击间隔（秒）
    private targetMonster: cc.Node = null; //当前攻击目标
    private isAttacking: boolean = false; //是否正在攻击
    
    protected onLoad(): void {
        // 初始化等级显示
        this.updateLevelLabel();
    }
    
    protected update(dt: number): void {
        // 更新攻击计时器
        if(this.attackTimer > 0) {
            this.attackTimer -= dt;
        }
    }
    
    /**
     * 设置植物类型
     */
    public setType(type: number) {
        this.plantType = type;
        
        // 设置spine动画数据
        if(!this.spineNode) {
            console.error('spineNode未设置')
            return
        }
        
        const spineComponent = this.spineNode.getComponent(sp.Skeleton)
        
        const skeletonData = this.spineDataArr[type]
        if(!skeletonData) {
            console.error(`spineDataArr[${type}]为空`)
            return
        }
        // 确保spine组件已启用
        spineComponent.enabled = true
        
        // 设置skeletonData
        spineComponent.skeletonData = skeletonData
        
        // 延迟设置皮肤，确保skeletonData已加载
        this.scheduleOnce(() => {
            this.updateSpineSkin();
        }, 0.1);
        
        this.scheduleOnce(() => {
            // 再次验证skeletonData
            if(!spineComponent.skeletonData) {
                console.error('延迟后skeletonData丢失！', {
                    spineComponent: spineComponent,
                    plantType: this.plantType
                })
                return
            }
            
            // 尝试播放idle动画
            try {
                spineComponent.setAnimation(0, 'idle', true)
                console.log('成功播放idle动画')
            } catch(e) {
                // 如果idle动画不存在，尝试播放第一个动画
                console.log('idle动画不存在，尝试播放默认动画', e)
                if(spineComponent.defaultAnimation) {
                    spineComponent.setAnimation(0, spineComponent.defaultAnimation, true)
                }
            }
        }, 0.1)
    }
    
    /**
     * 获取植物类型
     */
    public getType(): number {
        return this.plantType;
    }
    
    /**
     * 设置等级
     */
    public setLevel(level: number) {
        this.level = level;
        this.updateLevelLabel();
        this.updateSpineSkin();
    }
    
    /**
     * 更新spine皮肤（根据等级）
     */
    private updateSpineSkin() {
        if(!this.spineNode) return;
        
        const spineComponent = this.spineNode.getComponent(sp.Skeleton);
        if(!spineComponent || !spineComponent.skeletonData) return;
        
        const skinName = `level${this.level}`;
        try {
            spineComponent.setSkin(skinName);
        } catch(e) {
            console.log(`设置皮肤失败：${skinName}，尝试使用默认皮肤`, e);
            // 如果皮肤不存在，尝试使用默认皮肤
            try {
                spineComponent.setSkin('level1');
            } catch(e2) {
                console.log('设置默认皮肤失败', e2);
            }
        }
    }
    
    /**
     * 获取等级
     */
    public getLevel(): number {
        return this.level;
    }
    
    /**
     * 更新等级显示
     */
    private updateLevelLabel() {
        if(this.levelLb) {
            this.levelLb.string = this.level.toString();
        }
    }
    
    /**
     * 获取攻击力（攻击力等于等级）
     */
    public getAttackPower(): number {
        return this.level;
    }
    
    /**
     * 检查是否可以与另一个植物合成
     */
    public canMergeWith(other: plantItem): boolean {
        if(!other) return false;
        return this.plantType === other.getType() && this.level === other.getLevel();
    }
    
    /**
     * 合成植物（将另一个植物的等级加到当前植物上）
     */
    public merge(other: plantItem): boolean {
        if(!this.canMergeWith(other)) {
            return false;
        }
        this.setLevel(this.level + other.getLevel());
        return true;
    }
    
    /**
     * 设置位置索引
     */
    public setPositionIndex(index: number) {
        this.positionIndex = index;
    }
    
    /**
     * 获取位置索引
     */
    public getPositionIndex(): number {
        return this.positionIndex;
    }
    
    /**
     * 设置攻击目标
     */
    public setTarget(monster: cc.Node) {
        this.targetMonster = monster;
    }
    
    /**
     * 获取攻击目标
     */
    public getTarget(): cc.Node {
        return this.targetMonster;
    }
    
    /**
     * 检查是否可以攻击
     */
    public canAttack(): boolean {
        return this.attackTimer <= 0 && !this.isAttacking;
    }
    
    /**
     * 执行攻击，返回攻击力
     */
    public doAttack(): number {
        if(!this.canAttack() || !this.targetMonster) {
            return 0;
        }
        this.isAttacking = true;
        this.attackTimer = this.attackInterval;
        
        // 播放攻击动画
        this.playAttackAnimation();
        
        // 攻击动画结束后恢复待机
        this.scheduleOnce(() => {
            this.isAttacking = false;
            this.playIdleAnimation();
        }, 0.5); // 假设攻击动画持续0.5秒，可根据实际情况调整
        
        // 返回攻击力（等于等级）
        return this.getAttackPower();
    }
    
    /**
     * 播放待机动画
     */
    public playIdleAnimation() {
        try {
            // 优先使用spineNode
            let spineComponent: sp.Skeleton = null
            if(this.spineNode) {
                spineComponent = this.spineNode.getComponent(sp.Skeleton)
            }
            
            // 如果spineNode没有，尝试从子节点查找
            if(!spineComponent) {
                spineComponent = this.node.getComponentInChildren(sp.Skeleton)
            }
            
            // 调试信息
            if(!spineComponent) {
                console.log('无法播放待机动画：spineComponent为空', {
                    spineNode: this.spineNode,
                    hasSpineNode: !!this.spineNode,
                    node: this.node
                })
                return
            }
            
            if(!spineComponent.skeletonData) {
                console.log('无法播放待机动画：skeletonData为空', {
                    spineComponent: spineComponent,
                    skeletonData: spineComponent.skeletonData,
                    plantType: this.plantType,
                    spineDataArr: this.spineDataArr
                })
                return
            }
            
            spineComponent.setAnimation(0, 'idle', true);
        } catch(e) {
            console.log('播放待机动画失败', e);
        }
    }
    
    /**
     * 播放攻击动画
     */
    public playAttackAnimation() {
        try {
            // 优先使用spineNode
            let spineComponent: sp.Skeleton = null
            if(this.spineNode) {
                spineComponent = this.spineNode.getComponent(sp.Skeleton)
            }
            
            // 如果spineNode没有，尝试从子节点查找
            if(!spineComponent) {
                spineComponent = this.node.getComponentInChildren(sp.Skeleton)
            }
            spineComponent.setAnimation(0, 'attack', false);
        } catch(e) {
            console.log('播放攻击动画失败', e);
        }
    }
    
    /**
     * 获取植物类型
     */
    public getPlantType(): number {
        return this.plantType;
    }
    
    /**
     * 获取植物位置
     */
    public getPlantPosition(): cc.Vec3 {
        return this.node.position;
    }
    
    /**
     * 重置攻击状态（用于外部调用，不触发攻击逻辑）
     */
    public resetAttackState() {
        this.isAttacking = false;
        this.attackTimer = 0;
    }
    
    protected onDestroy(): void {
        // 清理定时器
        this.unscheduleAllCallbacks();
    }
}

