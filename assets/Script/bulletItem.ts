import mosterItem from "./mosterItem";
import RESSpriteFrame from "./RESSpriteFrame";

const { ccclass, property } = cc._decorator;

@ccclass
export default class bulletItem extends cc.Component {
    @property(sp.SkeletonData)
    private spineDataArr: sp.SkeletonData[] = []; // spine动画数据数组，根据植物type设置
    
    @property(cc.Node)
    private bulletSpine: cc.Node = null; // 子弹spine节点
    
    private plantType: number = 0; // 植物类型
    private level: number = 1; // 植物等级
    private targetPos: cc.Vec3 = null; // 目标位置
    private targetMonsterNode: cc.Node = null; // 目标怪物节点（用于动态更新位置）
    private moveSpeed: number = 800; // 移动速度
    private isExploded: boolean = false; // 是否已爆炸
    
    /**
     * 初始化子弹
     */
    public init(plantType: number, level: number, startPos: cc.Vec3, targetPos: cc.Vec3, targetMonsterNode?: cc.Node) {
        this.plantType = plantType;
        this.level = level;
        this.targetPos = targetPos ? targetPos.clone() : null;
        this.targetMonsterNode = targetMonsterNode;
        this.isExploded = false;
        this.node.setPosition(startPos);
        this.setupSpineData();
        this.setupSkin();
        this.playAnimation();
    }
    
    /**
     * 设置Spine数据（根据植物type）
     */
    private setupSpineData() {
        if(!this.bulletSpine) return;
        
        const spineComponent = this.bulletSpine.getComponent(sp.Skeleton);
        if(!spineComponent) return;
        
        if(this.spineDataArr && this.spineDataArr.length > this.plantType) {
            spineComponent.skeletonData = this.spineDataArr[this.plantType];
        }
    }
    /**
     * 设置皮肤（根据植物等级）
     */
    private setupSkin() {
        if(!this.bulletSpine) return;
        
        const spineComponent = this.bulletSpine.getComponent(sp.Skeleton);
        if(!spineComponent) return;
        
        const skinName = `level${this.level}`;
        try {
            spineComponent.setSkin(skinName);
        } catch(e) {
            console.log(`设置皮肤失败：${skinName}`, e);
            // 如果皮肤不存在，使用默认皮肤
            try {
                spineComponent.setSkin('level1');
            } catch(e2) {
                console.log('设置默认皮肤失败', e2);
            }
        }
    }
    
    /**
     * 播放动画
     */
    private playAnimation(animName: string = 'animation') {
        if(!this.bulletSpine) return;
        cc.audioEngine.play(RESSpriteFrame.instance.shootAudioClip,false,1)
        try {
            const spineComponent = this.bulletSpine.getComponent(sp.Skeleton);
            if(spineComponent) {
                spineComponent.setAnimation(0, animName, false);
            }
        } catch(e) {
            console.log(`播放动画失败：${animName}`, e);
        }
    }
    
    /**
     * 播放爆炸动画
     */
    public playExplosion(callback?: () => void) {
        if(this.isExploded) return;
        
        this.isExploded = true;
        this.playAnimation('explosion1');
        this.targetMonsterNode.getComponent(mosterItem).playHurtAnimation()
        // 监听爆炸动画完成
        if(callback) {
            try {
                const spineComponent = this.bulletSpine ? this.bulletSpine.getComponent(sp.Skeleton) : null;
                if(spineComponent) {
                    spineComponent.setCompleteListener((entry) => {
                        if(entry && entry.animation && entry.animation.name === 'explosion1') {
                            callback();
                            spineComponent.setCompleteListener(null);
                        }
                    });
                } else {
                    // 如果没有spine组件，延迟执行回调
                    this.scheduleOnce(() => {
                        callback();
                    }, 0.5);
                }
            } catch(e) {
                console.log('设置爆炸动画回调失败', e);
                if(callback) {
                    this.scheduleOnce(() => {
                        callback();
                    }, 0.5);
                }
            }
        }
    }
    
    private explosionCallback: () => void = null; // 爆炸完成回调
    
    /**
     * 设置爆炸完成回调
     */
    public setExplosionCallback(callback: () => void) {
        this.explosionCallback = callback;
    }
    
    /**
     * 更新子弹移动
     */
    protected update(dt: number) {
        if(this.isExploded || !this.node || !this.node.isValid) return;
        
        // 如果目标怪物节点存在且有效，动态更新目标位置
        if(this.targetMonsterNode && this.targetMonsterNode.isValid) {
            this.targetPos = this.targetMonsterNode.position.clone();
        }
        
        if(!this.targetPos) return;
        
        const currentPos = this.node.position;
        const direction = this.targetPos.sub(currentPos);
        const distance = direction.mag();
        
        if(distance < 10) {
            // 到达目标位置，播放爆炸动画
            this.node.setPosition(this.targetPos);
            this.playExplosion(this.explosionCallback);
        } else {
            // 继续移动
            const moveDistance = this.moveSpeed * dt;
            if(moveDistance >= distance) {
                // 本次移动会超过目标，直接到达
                this.node.setPosition(this.targetPos);
                this.playExplosion(this.explosionCallback);
            } else {
                // 正常移动
                const normalizedDir = direction.normalize();
                const newPos = currentPos.add(normalizedDir.mul(moveDistance));
                this.node.setPosition(newPos);
            }
        }
    }
    
    /**
     * 重置子弹（用于节点池回收）
     */
    public reset() {
        this.targetPos = null;
        this.targetMonsterNode = null;
        this.isExploded = false;
        this.explosionCallback = null;
        this.node.setPosition(0, 0, 0);
        
        // 清理spine监听
        try {
            const spineComponent = this.bulletSpine ? this.bulletSpine.getComponent(sp.Skeleton) : null;
            if(spineComponent) {
                spineComponent.setCompleteListener(null);
            }
        } catch(e) {
            // 忽略错误
        }
    }
}

