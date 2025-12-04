const { ccclass, property } = cc._decorator;

@ccclass
export default class mosterItem extends cc.Component {
    @property(cc.Label)
    private hpLabel: cc.Label = null; //血条Label，在编辑器中设置
    
    private currentHp: number = 0;
    private positionIndex: number = 0; //当前在mosterMapPosArr中的位置索引
    
    /**
     * 设置血条数量
     */
    public setHp(hp: number) {
        this.currentHp = hp;
        if(this.hpLabel) {
            this.hpLabel.string = hp.toString();
        }
    }
    /**
     * 获取当前血条
     */
    public getHp(): number {
        return this.currentHp;
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
     * 播放移动动画
     */
    public playWalkAnimation() {
        try {
            const spineComponent = this.node.getComponentInChildren(sp.Skeleton);
            if(spineComponent) {
                spineComponent.setAnimation(0, 'walk', true);
            }
        } catch(e) {
            console.log('播放移动动画失败', e);
        }
    }
    
    /**
     * 播放待机动画
     */
    public playIdleAnimation() {
        try {
            const spineComponent = this.node.getComponentInChildren(sp.Skeleton);
            if(spineComponent) {
                spineComponent.setAnimation(0, 'idle', true);
            }
        } catch(e) {
            console.log('播放待机动画失败', e);
        }
    }
    public playDeadAnimation(callback?: () => void) {
        try {
            const spineComponent = this.node.getComponentInChildren(sp.Skeleton);
            if(spineComponent) {
                spineComponent.setAnimation(0, 'dead', false);
                // 设置动画完成监听
                if(callback) {
                    spineComponent.setCompleteListener((entry) => {
                        if(entry && entry.animation && entry.animation.name === 'dead') {
                            callback();
                            // 移除监听，避免重复调用
                            spineComponent.setCompleteListener(null);
                        }
                    });
                }
            } 
        } catch(e) {
            console.log('播放死亡动画失败', e);
            if(callback) {
                callback();
            }
        }
    }
    /**
     * 受到伤害
     */
    public takeDamage(damage: number): boolean {
        if(damage <= 0) return false;
        const newHp = this.currentHp - damage;
        if(newHp <= 0) {
            this.setHp(0);
            return true; // 返回true表示怪物已死亡
        } else {
            this.setHp(newHp);
            return false; // 返回false表示怪物还活着
        }
    }
    
    /**
     * 检查是否死亡
     */
    public isDead(): boolean {
        return this.currentHp <= 0;
    }
}

