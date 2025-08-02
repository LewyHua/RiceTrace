# 设计模式详解：装饰器模式与策略模式

## 1. 装饰器模式 (Decorator Pattern)

### 1.1 什么是装饰器模式
装饰器模式是一种结构型设计模式，它允许在不改变对象结构的情况下，动态地给对象添加新的功能。在TypeScript中，装饰器通过`@`符号来使用。

### 1.2 在项目中的使用位置

#### 1.2.1 合约类装饰器
```typescript
// 文件: src/riceTracerContract.ts
@Info({ title: 'RiceTracerContract', description: 'Smart contract for rice traceability system' })
export class RiceTracerContract extends Contract {
    // 合约实现...
}
```

**作用：**
- `@Info` 装饰器为合约类添加元数据信息
- 定义合约的标题和描述
- 这些信息会被Fabric框架用于生成API文档和合约注册

#### 1.2.2 方法装饰器
```typescript
// 文件: src/riceTracerContract.ts
@Transaction(false)  // 表示这是一个查询方法，不修改状态
@Returns('OrganizationInfo')  // 定义返回值类型
public async GetCallerInfo(ctx: Context): Promise<OrganizationInfo> {
    const mspId = ctx.clientIdentity.getMSPID();
    const orgType = this.getOrganizationType(mspId);
    
    return {
        orgId: mspId,
        orgType: orgType,
        orgName: mspId
    };
}
```

**装饰器详解：**

1. **@Transaction(false)**
   - 表示这是一个查询方法，不会修改区块链状态
   - `false`参数表示不需要背书策略
   - 如果设为`true`，则表示这是一个写操作

2. **@Returns('OrganizationInfo')**
   - 定义方法的返回值类型
   - 帮助Fabric框架进行类型检查和序列化
   - 提供API文档的自动生成

#### 1.2.3 数据模型装饰器
```typescript
// 文件: src/types.ts
@Object()
export class OrganizationInfo {
    @Property()
    public orgId: string = '';

    @Property()
    public orgType: OrganizationType = OrganizationType.CONSUMER;

    @Property()
    public orgName: string = '';
}
```

**装饰器详解：**

1. **@Object()**
   - 标记类为Fabric可序列化的对象
   - 使类可以被Fabric框架正确处理

2. **@Property()**
   - 标记属性为可序列化的字段
   - 支持复杂类型的序列化

### 1.3 装饰器模式的优势

1. **声明式编程**
   ```typescript
   // 不需要手动注册，装饰器自动处理
   @Transaction(false)
   @Returns('string')
   public async GetPermissionMatrix(ctx: Context): Promise<string> {
       // 方法实现...
   }
   ```

2. **代码简洁性**
   - 减少了样板代码
   - 提高了代码可读性

3. **框架集成**
   - 自动与Fabric框架集成
   - 提供类型安全和文档生成

## 2. 策略模式 (Strategy Pattern)

### 2.1 什么是策略模式
策略模式是一种行为型设计模式，它定义了一系列算法，并将每一个算法封装起来，使它们可以互相替换。策略模式让算法的变化不会影响到使用算法的客户。

### 2.2 在项目中的使用位置

#### 2.2.1 组织类型映射策略
```typescript
// 文件: src/riceTracerContract.ts
private getOrganizationType(mspId: string): OrganizationType {
    // 策略映射表
    const mspToOrgType: Record<string, OrganizationType> = {
        'Org1MSP': OrganizationType.FARM,              // 农场组织策略
        'Org2MSP': OrganizationType.MIDDLEMAN_TESTER,  // 中间商/检测机构策略
        'Org3MSP': OrganizationType.CONSUMER           // 消费者策略
    };

    return mspToOrgType[mspId] || OrganizationType.CONSUMER;
}
```

**策略模式分析：**

1. **策略定义**
   ```typescript
   // 策略接口（隐式定义）
   type OrganizationStrategy = (mspId: string) => OrganizationType;
   ```

2. **具体策略实现**
   ```typescript
   // 农场策略
   const farmStrategy = (mspId: string) => {
       if (mspId === 'Org1MSP') return OrganizationType.FARM;
       return OrganizationType.CONSUMER;
   };
   
   // 中间商策略
   const middlemanStrategy = (mspId: string) => {
       if (mspId === 'Org2MSP') return OrganizationType.MIDDLEMAN_TESTER;
       return OrganizationType.CONSUMER;
   };
   
   // 消费者策略
   const consumerStrategy = (mspId: string) => {
       if (mspId === 'Org3MSP') return OrganizationType.CONSUMER;
       return OrganizationType.CONSUMER;
   };
   ```

3. **策略选择器**
   ```typescript
   const mspToOrgType: Record<string, OrganizationType> = {
       'Org1MSP': OrganizationType.FARM,
       'Org2MSP': OrganizationType.MIDDLEMAN_TESTER,
       'Org3MSP': OrganizationType.CONSUMER
   };
   ```

#### 2.2.2 权限检查策略
```typescript
// 文件: src/riceTracerContract.ts
private checkPermission(ctx: Context, allowedTypes: OrganizationType[]): void {
    const mspId = ctx.clientIdentity.getMSPID();
    const callerType = this.getOrganizationType(mspId);  // 使用策略模式

    if (!allowedTypes.includes(callerType)) {
        const allowedNames = allowedTypes.map(type => {
            // 策略模式：根据类型选择显示名称
            switch (type) {
                case OrganizationType.FARM: return 'Farm';
                case OrganizationType.MIDDLEMAN_TESTER: return 'Middleman/tester';
                case OrganizationType.CONSUMER: return 'Consumer';
                default: return 'Unknown';
            }
        }).join(', ');
        
        throw new Error(`Permission denied: Only the following organization types can call: ${allowedNames}`);
    }
}
```

**策略模式在权限检查中的应用：**

1. **组织类型识别策略**
   ```typescript
   const callerType = this.getOrganizationType(mspId);
   ```

2. **权限验证策略**
   ```typescript
   if (!allowedTypes.includes(callerType)) {
       // 权限拒绝策略
   }
   ```

3. **错误消息生成策略**
   ```typescript
   const allowedNames = allowedTypes.map(type => {
       switch (type) {
           case OrganizationType.FARM: return 'Farm';
           case OrganizationType.MIDDLEMAN_TESTER: return 'Middleman/tester';
           case OrganizationType.CONSUMER: return 'Consumer';
           default: return 'Unknown';
       }
   }).join(', ');
   ```

### 2.3 策略模式的优势

#### 2.3.1 易于扩展
```typescript
// 添加新的组织类型策略
const mspToOrgType: Record<string, OrganizationType> = {
    'Org1MSP': OrganizationType.FARM,
    'Org2MSP': OrganizationType.MIDDLEMAN_TESTER,
    'Org3MSP': OrganizationType.CONSUMER,
    'Org4MSP': OrganizationType.DISTRIBUTOR,  // 新增策略
    'Org5MSP': OrganizationType.RETAILER      // 新增策略
};
```

#### 2.3.2 易于测试
```typescript
// 测试中的策略验证
describe('Organization Type Logic', () => {
    const getOrganizationType = (mspId: string): number => {
        const mspToOrgType: Record<string, number> = {
            'Org1MSP': 1,
            'Org2MSP': 2,
            'Org3MSP': 3
        };
        return mspToOrgType[mspId] || 3;
    };

    test('should return correct organization type for Farm MSP', () => {
        const result = getOrganizationType('Org1MSP');
        expect(result).toBe(1);
    });
});
```

#### 2.3.3 配置化
```typescript
// 可以通过配置文件动态调整策略
const config = {
    organizationMapping: {
        'Org1MSP': 'FARM',
        'Org2MSP': 'MIDDLEMAN_TESTER',
        'Org3MSP': 'CONSUMER'
    }
};
```

## 3. 两种模式的结合使用

### 3.1 在合约方法中的结合
```typescript
@Transaction(false)  // 装饰器模式：声明方法类型
@Returns('OrganizationInfo')  // 装饰器模式：声明返回类型
public async GetCallerInfo(ctx: Context): Promise<OrganizationInfo> {
    const mspId = ctx.clientIdentity.getMSPID();
    const orgType = this.getOrganizationType(mspId);  // 策略模式：选择组织类型
    
    return {
        orgId: mspId,
        orgType: orgType,
        orgName: mspId
    };
}
```

### 3.2 在权限控制中的结合
```typescript
@Transaction(true)  // 装饰器模式：声明写操作
public async CreateRiceBatch(ctx: Context, ...args): Promise<void> {
    this.checkPermission(ctx, [OrganizationType.FARM]);  // 策略模式：权限检查
    
    // 方法实现...
}
```

## 4. 最佳实践建议

### 4.1 装饰器模式最佳实践
1. **保持装饰器简洁**
   ```typescript
   @Transaction(false)
   @Returns('string')
   public async simpleQuery(): Promise<string> {
       return "result";
   }
   ```

2. **合理使用装饰器组合**
   ```typescript
   @Info({ title: 'ComplexContract' })
   @Object()
   export class ComplexContract extends Contract {
       // 合约实现
   }
   ```

### 4.2 策略模式最佳实践
1. **使用枚举定义策略**
   ```typescript
   export enum OrganizationType {
       FARM = 1,
       MIDDLEMAN_TESTER = 2,
       CONSUMER = 3
   }
   ```

2. **提供默认策略**
   ```typescript
   return mspToOrgType[mspId] || OrganizationType.CONSUMER;
   ```

3. **策略配置化**
   ```typescript
   // 可以从配置文件或环境变量读取
   const strategyConfig = process.env.ORG_STRATEGY_CONFIG || 'default';
   ```

## 5. 总结

装饰器模式和策略模式在你的项目中发挥了重要作用：

- **装饰器模式**：提供了声明式的API定义，简化了与Fabric框架的集成
- **策略模式**：实现了灵活的组织类型映射和权限控制

这两种模式的结合使用，使你的智能合约具有更好的可维护性、可扩展性和可测试性。 