// --- 导入所需模块 ---
require('dotenv').config(); // 加载 .env 文件中的环境变量
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');

// --- 服务器配置 ---
const app = express();
const PORT = process.env.PORT || 8080; // Zeabur 通常使用 8080 端口

// --- 中间件配置 ---
app.use(cors()); // 启用CORS，允许小程序跨域访问
const storage = multer.memoryStorage(); // 将上传的文件暂存在内存中
const upload = multer({ storage: storage });

// --- 从环境变量中获取Dify的关键信息 ---
const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_BASE_URL = process.env.DIFY_API_URL; // 我们现在把它理解为基础URL: https://api.dify.ai/v1

// --- 这是我们从Dify日志中找到的、固定不变的工作流ID！---
const WORKFLOW_ID = '80b2b6f4-926e-4927-8297-535a82af7b2e'; // 请确保这个ID是您自己的

// --- API 路由: /api/analyzeFace ---
app.post('/api/analyzeFace', upload.single('file'), async (req, res) => {
  console.log('Received a new request to /api/analyzeFace');

  // 1. 检查配置是否齐全
  if (!DIFY_API_KEY || !DIFY_BASE_URL || !WORKFLOW_ID) {
    console.error('Server configuration error: API Key, Base URL, or Workflow ID is missing.');
    return res.status(500).json({ error: '服务器配置错误' });
  }

  // 2. 检查文件是否上传
  if (!req.file) {
    console.error('No file uploaded in the request.');
    return res.status(400).json({ error: '没有上传文件' });
  }

  try {
    // =================================================================
    // 步骤一：将小程序传来的图片，上传到Dify的文件服务器
    // =================================================================
    console.log('Step 1: Uploading file to Dify...');
    const fileUploadFormData = new FormData();
    fileUploadFormData.append('file', req.file.buffer, req.file.originalname);
    fileUploadFormData.append('user', 'wechat-miniprogram-user'); // 定义一个用户标识

    const fileUploadResponse = await axios.post(
      `${DIFY_BASE_URL}/files/upload`, // 拼接成上传文件的URL
      fileUploadFormData,
      {
        headers: {
          ...fileUploadFormData.getHeaders(),
          'Authorization': `Bearer ${DIFY_API_KEY}`,
        },
      }
    );
    const uploadedFileId = fileUploadResponse.data.id;
    console.log(`File uploaded successfully. File ID: ${uploadedFileId}`);

    // =================================================================
    // 步骤二：带着上传后的文件ID，去执行我们指定的工作流
    // =================================================================
    console.log(`Step 2: Executing workflow ${WORKFLOW_ID} with the uploaded file...`);
    const workflowExecutionResponse = await axios.post(
      `${DIFY_BASE_URL}/workflows/${WORKFLOW_ID}/run`, // 拼接成执行特定工作流的URL
      {
        inputs: {
          "shuru": { // "shuru" 必须和您在Dify“开始”节点定义的变量名完全一致！
            "upload_file_id": uploadedFileId,
            "type": "image",
            "transfer_method": "remote_url"
          }
        },
        response_mode: 'blocking', // 使用阻塞模式，直接等待AI返回完整结果
        user: 'wechat-miniprogram-user',
      },
      {
        headers: {
          'Authorization': `Bearer ${DIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    // 成功！将Dify工作流返回的最终结果，发送回小程序
    console.log('Workflow executed successfully. Returning result to client.');
    res.status(200).json(workflowExecutionResponse.data);

  } catch (error) {
    // 如果过程中任何一步出错，打印详细错误并返回错误信息
    console.error('An error occurred during the Dify process:', error.response ? JSON.stringify(error.response.data) : error.message);
    res.status(error.response ? error.response.status : 500).json({
      error: '调用AI服务失败',
      details: error.response ? error.response.data : '未知服务器错误',
    });
  }
});

// --- 启动服务器 ---
app.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
  console.log(`Ready to receive requests at /api/analyzeFace`);
});