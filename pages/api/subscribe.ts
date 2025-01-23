import type { NextApiRequest, NextApiResponse } from 'next'

// 飞书 API 配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID
const FEISHU_TABLE_NAME = process.env.FEISHU_TABLE_NAME

// 获取飞书访问令牌
async function getFeishuAccessToken() {
  try {
    console.log('Requesting Feishu access token with:', {
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET?.slice(0, 4) + '****'  // 只显示密钥前4位
    })

    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "app_id": FEISHU_APP_ID,
        "app_secret": FEISHU_APP_SECRET
      })
    })
    
    const data = await response.json()
    console.log('Access token response:', {
      code: data.code,
      msg: data.msg,
      expire: data.expire,
      token: data.tenant_access_token?.slice(0, 10) + '****'  // 只显示token前10位
    })
    
    if (data.code !== 0) {
      throw new Error(`Failed to get access token: ${data.msg}`)
    }
    
    return data.tenant_access_token
  } catch (error) {
    console.error('Error getting access token:', error)
    throw error
  }
}

// 添加记录到飞书多维表格
async function addToFeishuTable(email: string, accessToken: string) {
  try {
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_TABLE_ID}/tables/${FEISHU_TABLE_NAME}/records`
    
    console.log('API Configuration:', {
      FEISHU_APP_ID,
      FEISHU_TABLE_ID,
      FEISHU_TABLE_NAME,
      url
    })
    
    const requestBody = {
      fields: {
        "Email": email,
        "Submitted At": new Date().toISOString()
      }
    }
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2))
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8'
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })
    
    const data = await response.json()
    console.log('Response:', {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      data: JSON.stringify(data, null, 2)
    })
    
    if (!response.ok) {
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        data
      })
      
      if (response.status === 403) {
        throw new Error('Permission denied: Please ensure the app is added as a collaborator with edit permissions')
      }
      
      throw new Error(data.msg || 'Failed to add record')
    }
    
    return data
  } catch (error) {
    console.error('Error adding record:', error)
    throw error
  }
}

// 获取租户 Token
async function getTenantToken() {
  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "app_id": FEISHU_APP_ID,
        "app_secret": FEISHU_APP_SECRET
      })
    })
    
    const data = await response.json()
    if (data.code === 0) {
      return data.tenant_access_token
    }
    return null
  } catch (error) {
    console.error('Error getting tenant token:', error)
    return null
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Request headers:', req.headers)
    console.log('Request body:', req.body)
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    // 验证环境变量
    if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_TABLE_ID || !FEISHU_TABLE_NAME) {
      console.error('Missing environment variables:', {
        FEISHU_APP_ID: !!FEISHU_APP_ID,
        FEISHU_APP_SECRET: !!FEISHU_APP_SECRET,
        FEISHU_TABLE_ID: !!FEISHU_TABLE_ID,
        FEISHU_TABLE_NAME: !!FEISHU_TABLE_NAME
      })
      throw new Error('Missing required environment variables')
    }

    // 获取访问令牌
    const accessToken = await getFeishuAccessToken()
    
    // 添加到飞书表格
    await addToFeishuTable(email, accessToken)

    res.status(200).json({ message: 'Thank you for subscribing!' })
  } catch (error) {
    console.error('Subscription error:', error)
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    })
  }
} 