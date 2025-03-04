document.addEventListener('DOMContentLoaded', () => {
    const visualizeBtn = document.getElementById('visualize-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const xmlInput = document.getElementById('xml-input');
    const visualizationContainer = document.getElementById('visualization-container');

    visualizeBtn.addEventListener('click', () => {
        const xmlContent = xmlInput.value.trim();
        if (xmlContent) {
            visualizeXml(xmlContent);
        } else {
            alert('请输入XML内容');
        }
    });

    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                xmlInput.value = e.target.result;
                visualizeXml(e.target.result);
            };
            reader.readAsText(file);
        }
    });

    function visualizeXml(xmlContent) {
        try {
            // 解析XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
            
            // 检查解析错误
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('XML解析错误');
            }
            
            // 转换XML为树形结构
            const treeData = xmlToTreeData(xmlDoc.documentElement);
            
            // 使用ELK布局引擎处理节点位置
            createVisualization(treeData);
        } catch (error) {
            alert(`错误: ${error.message}`);
            console.error(error);
        }
    }

    function xmlToTreeData(xmlNode) {
        const node = {
            id: generateId(),
            name: xmlNode.nodeName,
            attributes: [],
            children: []
        };
        
        // 处理属性
        if (xmlNode.attributes && xmlNode.attributes.length > 0) {
            for (let i = 0; i < xmlNode.attributes.length; i++) {
                const attr = xmlNode.attributes[i];
                node.attributes.push({
                    name: attr.name,
                    value: attr.value
                });
            }
        }
        
        // 处理子节点
        xmlNode.childNodes.forEach(child => {
            if (child.nodeType === 1) { // 元素节点
                node.children.push(xmlToTreeData(child));
            } else if (child.nodeType === 3) { // 文本节点
                const text = child.nodeValue.trim();
                if (text) {
                    node.text = text;
                }
            }
        });
        
        return node;
    }

    function generateId() {
        return 'node_' + Math.random().toString(36).substr(2, 9);
    }

    function createVisualization(treeData) {
        // 清空容器
        visualizationContainer.innerHTML = '';
        
        // 创建ELK布局引擎
        const elk = new ELK();
        
        // 将树数据转换为ELK图形
        const elkGraph = convertToElkGraph(treeData);
        
        // 计算布局
        elk.layout(elkGraph)
            .then(layoutedGraph => {
                // 创建SVG
                renderGraph(layoutedGraph);
            })
            .catch(error => {
                console.error(error);
                alert('布局计算错误');
            });
    }

    function convertToElkGraph(treeData) {
        const nodes = [];
        const edges = [];
        
        // 递归处理节点
        function processNode(node, parent) {
            // 计算节点尺寸
            const nodeHeight = 30 + (node.attributes.length * 20) + (node.text ? 20 : 0);
            const nodeWidth = Math.max(
                node.name.length * 10, 
                ...node.attributes.map(attr => (attr.name + ': ' + attr.value).length * 7),
                node.text ? node.text.length * 7 : 0
            ) + 40;
            
            // 添加节点
            nodes.push({
                id: node.id,
                width: nodeWidth,
                height: nodeHeight,
                data: node
            });
            
            // 添加边
            if (parent) {
                edges.push({
                    id: `edge_${parent.id}_${node.id}`,
                    sources: [parent.id],
                    targets: [node.id]
                });
            }
            
            // 处理子节点
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    processNode(child, node);
                });
            }
        }
        
        processNode(treeData, null);
        
        // 创建ELK图形
        return {
            id: 'root',
            layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': 'DOWN',
                'elk.spacing.nodeNode': '50',
                'elk.layered.spacing.nodeNodeBetweenLayers': '100',
                'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX'
            },
            children: nodes,
            edges: edges
        };
    }

    function renderGraph(graph) {
        const width = visualizationContainer.clientWidth;
        const height = Math.max(visualizationContainer.clientHeight, graph.height + 100);
        
        // 创建SVG
        const svg = d3.select('#visualization-container')
            .append('svg')
            .attr('width', '100%')
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .append('g');
            
        // 添加缩放功能
        const zoom = d3.zoom()
            .on('zoom', (event) => {
                svg.attr('transform', event.transform);
            });
            
        d3.select('#visualization-container svg')
            .call(zoom);
            
        // 渲染边
        graph.edges.forEach(edge => {
            const sourceNode = graph.children.find(node => node.id === edge.sources[0]);
            const targetNode = graph.children.find(node => node.id === edge.targets[0]);
            
            if (sourceNode && targetNode) {
                const sourceX = sourceNode.x + sourceNode.width / 2;
                const sourceY = sourceNode.y + sourceNode.height;
                const targetX = targetNode.x + targetNode.width / 2;
                const targetY = targetNode.y;
                
                svg.append('path')
                    .attr('class', 'link')
                    .attr('d', `M${sourceX},${sourceY} C${sourceX},${(sourceY + targetY) / 2} ${targetX},${(sourceY + targetY) / 2} ${targetX},${targetY}`);
            }
        });
        
        // 渲染节点
        const nodes = svg.selectAll('.node-group')
            .data(graph.children)
            .enter()
            .append('g')
            .attr('class', 'node-group')
            .attr('transform', d => `translate(${d.x}, ${d.y})`);
            
        // 节点矩形
        nodes.append('rect')
            .attr('class', 'node')
            .attr('width', d => d.width)
            .attr('height', d => d.height);
            
        // 节点名称
        nodes.append('text')
            .attr('class', 'node-text')
            .attr('x', d => d.width / 2)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .text(d => d.data.name);
            
        // 节点属性
        nodes.each(function(d) {
            const node = d3.select(this);
            d.data.attributes.forEach((attr, index) => {
                node.append('text')
                    .attr('class', 'attribute')
                    .attr('x', 10)
                    .attr('y', 40 + (index * 20))
                    .text(`${attr.name}: ${attr.value}`);
            });
            
            // 文本内容
            if (d.data.text) {
                node.append('text')
                    .attr('class', 'attribute')
                    .attr('x', 10)
                    .attr('y', 40 + (d.data.attributes.length * 20))
                    .text(`文本: ${d.data.text.length > 20 ? d.data.text.substring(0, 20) + '...' : d.data.text}`);
            }
        });
    }
}); 